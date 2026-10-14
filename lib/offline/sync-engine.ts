/**
 * MatiSathi Offline Synchronization & Conflict Resolution Engine
 *
 * Contract:
 * - On reconnect: syncs queued items (doubts, quizzes, mastery) in order
 * - Conflict resolution: Last-Write-Wins (LWW) based on mastery timestamps
 * - Processes queued doubts through the agentic loop to generate followups
 * - Optional Ollama offline LLM probe & execution when OLLAMA_BASE_URL is reachable
 */

import {
  getOfflineQueue,
  removeOfflineQueueItem,
  saveLocalMastery,
  getLocalMastery,
  type OfflineQueueItem,
} from './dexie-db';

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  conflictsResolved: number;
  processedDoubts: string[];
  errors: string[];
}

export interface OllamaProbeResult {
  reachable: boolean;
  baseUrl: string;
  models: string[];
}

/**
 * Checks whether Ollama is locally reachable at OLLAMA_BASE_URL (or localhost:11434).
 */
export async function probeOllama(
  customUrl?: string,
): Promise<OllamaProbeResult> {
  const baseUrl = (
    customUrl ||
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_OLLAMA_BASE_URL) ||
    'http://localhost:11434'
  ).replace(/\/+$/, '');

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1200); // 1.2s timeout for local check

    const res = await fetch(`${baseUrl}/api/tags`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const models = Array.isArray(data.models) ? data.models.map((m: { name: string }) => m.name) : [];
      return { reachable: true, baseUrl, models };
    }
  } catch {
    // Ollama unreachable
  }

  return { reachable: false, baseUrl, models: [] };
}

/**
 * Generates an offline lesson or answer using local Ollama if reachable.
 */
export async function generateOllamaOfflineResponse(
  query: string,
  conceptNameOr: string,
  conceptNameEn: string,
  ruralAnalogy: string,
  baseUrl: string = 'http://localhost:11434',
  modelName: string = 'llama3.2',
): Promise<{ textOdia: string; example: string; wordCount: number } | null> {
  try {
    const prompt = [
      `You are MatiSathi (ମାଟି ସାଥୀ), a rural Class 9 tutor in Odisha.`,
      `Explain "${conceptNameOr} (${conceptNameEn})" in simple spoken Odia (under 140 words).`,
      `Use English technical terms in brackets.`,
      `Anchor with this village analogy: "${ruralAnalogy}".`,
      `Student question: "${query}"`,
    ].join('\n');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelName,
        prompt,
        stream: false,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const text = (data.response || '').trim();
      const words = text.split(/\s+/).filter(Boolean);
      return {
        textOdia: text,
        example: ruralAnalogy,
        wordCount: words.length,
      };
    }
  } catch (err) {
    console.warn('[Ollama] Offline generation failed, falling back to local cached capsule:', err);
  }
  return null;
}

/**
 * Synchronizes offline items with PostgreSQL server.
 * Implements Last-Write-Wins (LWW) conflict resolution for mastery records.
 */
export async function syncOfflineQueueToServer(
  learnerId: string,
): Promise<SyncResult> {
  const queue = await getOfflineQueue();
  const result: SyncResult = {
    success: true,
    syncedCount: 0,
    failedCount: 0,
    conflictsResolved: 0,
    processedDoubts: [],
    errors: [],
  };

  if (queue.length === 0) {
    return result;
  }

  for (const item of queue) {
    try {
      if (item.type === 'mastery_update' || item.type === 'quiz_attempt') {
        const conceptId = item.conceptId || (item.payload.conceptId as string);
        const localScore = Number(item.payload.score ?? 0);
        const localUpdatedAt = new Date(item.createdAt).getTime();

        // 1. Fetch server's current mastery for conflict resolution
        let serverMastery = null;
        try {
          const sRes = await fetch(`/api/learner/mastery?conceptId=${encodeURIComponent(conceptId)}`, {
            headers: { 'x-learner-id': learnerId },
          });
          if (sRes.ok) {
            const sData = await sRes.json();
            serverMastery = sData.mastery;
          }
        } catch {
          // If server query fails, proceed with direct post
        }

        // 2. Resolve conflict via Last-Write-Wins (LWW)
        let winningScore = localScore;
        let isLocalWinner = true;

        if (serverMastery && serverMastery.lastSeen) {
          const serverTime = new Date(serverMastery.lastSeen).getTime();
          if (serverTime > localUpdatedAt) {
            // Server has newer timestamp -> server wins!
            winningScore = Number(serverMastery.score);
            isLocalWinner = false;
            result.conflictsResolved++;
            // Update local IndexedDB to mirror server truth
            await saveLocalMastery({
              learnerId,
              conceptId,
              score: winningScore,
              attempts: Number(serverMastery.attempts || 1),
              lastSeen: serverMastery.lastSeen,
              nextReviewAt: serverMastery.nextReviewAt,
              updatedAt: serverMastery.lastSeen,
            });
          }
        }

        // 3. If local record wins or is up-to-date, post to server
        if (isLocalWinner) {
          const postRes = await fetch('/api/learner/mastery', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-learner-id': learnerId,
            },
            body: JSON.stringify({
              conceptId,
              score: winningScore,
              nextReviewAt: item.payload.nextReviewAt || null,
            }),
          });

          if (!postRes.ok) {
            throw new Error(`Mastery post failed with status ${postRes.status}`);
          }
        }

        await removeOfflineQueueItem(item.id);
        result.syncedCount++;
      } else if (item.type === 'doubt') {
        const doubtText = (item.payload.text || item.payload.query || '') as string;
        const conceptId = (item.conceptId || item.payload.conceptId) as string | undefined;

        // 1. Record doubt row
        const doubtRes = await fetch('/api/learner/doubts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-learner-id': learnerId,
          },
          body: JSON.stringify({
            text: doubtText,
            language: (item.payload.language as string) || 'or-IN',
            detectedConceptId: conceptId || null,
          }),
        });

        if (!doubtRes.ok) {
          throw new Error(`Doubt post failed with status ${doubtRes.status}`);
        }

        // 2. Let the Agentic Tutor turn process the doubt & schedule followups
        const tutorRes = await fetch('/api/tutor/turn', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'x-learner-id': learnerId,
          },
          body: JSON.stringify({
            text: doubtText,
            conceptId: conceptId || null,
          }),
        });

        if (tutorRes.ok) {
          const tutorData = await tutorRes.json();
          result.processedDoubts.push(tutorData.turnId || item.id);
        }

        await removeOfflineQueueItem(item.id);
        result.syncedCount++;
      }
    } catch (itemError) {
      result.failedCount++;
      result.errors.push(itemError instanceof Error ? itemError.message : String(itemError));
      console.warn(`[SyncEngine] Failed syncing item ${item.id}:`, itemError);
    }
  }

  result.success = result.failedCount === 0;
  return result;
}
