import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  generateLocalOfflineResponse,
  getCachedMastery,
  getOfflineQueuedDoubts,
  clearStorageForTesting,
} from '@/lib/matisathi/offline-storage';
import {
  matchOfflineConcept,
  saveActiveLessonProgress,
  getActiveLessonProgress,
  clearActiveLessonProgress,
  enqueueOfflineItem,
  getOfflineQueue,
  removeOfflineQueueItem,
  saveLocalMastery,
  getLocalMastery,
  clearDexieMemoryForTesting,
} from '@/lib/offline/dexie-db';
import {
  syncOfflineQueueToServer,
  probeOllama,
} from '@/lib/offline/sync-engine';

describe('MatiSathi Offline Engine & Sync', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    clearStorageForTesting();
    clearDexieMemoryForTesting();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('Local Offline Fallback & Decision Trace', () => {
    it('generates immediate offline response and decision trace when disconnected', () => {
      const offlineQuery = 'ମାଟି କଳସୀ ପାଣି ଥଣ୍ଡା କାହିଁକି ରହେ?';

      const resp = generateLocalOfflineResponse(offlineQuery, 'text');

      expect(resp).toBeDefined();
      expect(resp.source).toBe('offline_capsule');
      expect(resp.detectedTopicOdia).toContain('ବାଷ୍ପୀଭବନ');
      expect(resp.explanationOdia).toContain('ମାଟି କଳସୀ');
      expect(resp.decisionTrace).toBeDefined();
      expect(resp.decisionTrace.length).toBeGreaterThanOrEqual(3);

      // Verify offline queue was populated in local storage
      const queue = getOfflineQueuedDoubts();
      expect(queue.length).toBe(1);
      expect(queue[0].queryText).toBe(offlineQuery);
      expect(queue[0].synced).toBe(false);
    });
  });

  describe('Rule-Based Keyword/Embedding-Free Concept Matcher', () => {
    it('accurately matches cell wall doubts in Odia and English', () => {
      const match1 = matchOfflineConcept('ଉଦ୍ଭିଦ କୋଷ ପ୍ରାଚୀର (Cell Wall) କାହିଁକି ଥାଏ?');
      expect(match1.id).toBe('sci-c5-cell-wall');

      const match2 = matchOfflineConcept('What is plant cellulose wall function?');
      expect(match2.id).toBe('sci-c5-cell-wall');
    });

    it('accurately matches cell membrane / diffusion doubts', () => {
      const match = matchOfflineConcept('କୋଷ ଝିଲ୍ଲୀ ଏବଂ ବିସରଣ (cell membrane diffusion)');
      expect(match.id).toBe('sci-c5-cell-membrane');
    });

    it('accurately matches mitochondria doubts', () => {
      const match = matchOfflineConcept('ମାଇଟୋକଣ୍ଡ୍ରିଆ କୋଷର ଶକ୍ତି କେନ୍ଦ୍ର (mitochondria ATP powerhouse)');
      expect(match.id).toBe('sci-c5-mitochondria');
    });

    it('accurately matches motion, speed, and velocity doubts', () => {
      const speedMatch = matchOfflineConcept('ବେଗ ଏବଂ ଦ୍ରୁତି ମଧ୍ୟରେ ପାର୍ଥକ୍ୟ (speed velocity difference)');
      expect(speedMatch.id).toBe('sci-c8-speed-velocity');

      const accelMatch = matchOfflineConcept('ତ୍ୱରଣ କ’ଣ? (what is acceleration)');
      expect(accelMatch.id).toBe('sci-c8-acceleration');
    });

    it('generates dynamic topic concept for universal or unknown queries rather than hardcoding cell basics', () => {
      const fallback = matchOfflineConcept('ଅଜଣା ପ୍ରଶ୍ନ କିଛି ବି');
      expect(fallback.id).toMatch(/^dyn-/);
      expect(fallback.nameOr).toContain('ଅଜଣା ପ୍ରଶ୍ନ କିଛି ବି');
    });
  });

  describe('Active Lesson State Continuity', () => {
    it('saves, retrieves, and clears active lesson state so learner continues where she left off', async () => {
      expect(await getActiveLessonProgress()).toBeUndefined();

      await saveActiveLessonProgress({
        conceptId: 'sci-c5-mitochondria',
        conceptNameOr: 'ମାଇଟୋକଣ୍ଡ୍ରିଆ',
        conceptNameEn: 'Mitochondria (Powerhouse)',
        chapter: 'କୋଷ – ଜୀବନର ମୌଳିକ ଏକକ',
        currentStep: 'teaching',
      });

      const saved = await getActiveLessonProgress();
      expect(saved).toBeDefined();
      expect(saved?.conceptId).toBe('sci-c5-mitochondria');
      expect(saved?.conceptNameOr).toBe('ମାଇଟୋକଣ୍ଡ୍ରିଆ');

      await clearActiveLessonProgress();
      expect(await getActiveLessonProgress()).toBeUndefined();
    });
  });

  describe('Offline Queue & Last-Write-Wins (LWW) Sync Engine', () => {
    it('queues offline items and deletes on sync', async () => {
      const item = await enqueueOfflineItem('doubt', 'learner_test_1', {
        text: 'କୋଷ କାହାକୁ କୁହନ୍ତି?',
      });

      const queueBefore = await getOfflineQueue();
      expect(queueBefore.length).toBe(1);
      expect(queueBefore[0].id).toBe(item.id);

      await removeOfflineQueueItem(item.id);
      const queueAfter = await getOfflineQueue();
      expect(queueAfter.length).toBe(0);
    });

    it('resolves conflicts via Last-Write-Wins (LWW): Local wins if local is newer', async () => {
      const learnerId = 'learner_test_1';
      const conceptId = 'sci-c5-cell-wall';
      const localTime = new Date('2026-10-13T12:00:00Z').toISOString();
      const olderServerTime = new Date('2026-10-13T10:00:00Z').toISOString();

      await enqueueOfflineItem(
        'mastery_update',
        learnerId,
        { conceptId, score: 0.85 },
        conceptId,
      );

      // Force createdAt to be localTime
      const queue = await getOfflineQueue();
      queue[0].createdAt = localTime;

      const fetchMock = vi.fn().mockImplementation((url: string, options?: RequestInit) => {
        if (url.includes('/api/learner/mastery') && options?.method !== 'POST') {
          // Server returns older mastery
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              mastery: {
                conceptId,
                score: 0.5,
                lastSeen: olderServerTime,
                attempts: 1,
              },
            }),
          });
        }
        if (url.includes('/api/learner/mastery') && options?.method === 'POST') {
          // Server accepts newer local score
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ success: true }),
          });
        }
        return Promise.resolve({ ok: true, json: async () => ({}) });
      });

      global.fetch = fetchMock;

      const syncResult = await syncOfflineQueueToServer(learnerId);
      expect(syncResult.success).toBe(true);
      expect(syncResult.syncedCount).toBe(1);
      expect(syncResult.conflictsResolved).toBe(0); // Local won, no overwrite

      // Post should have been called with local score 0.85
      const postCalls = fetchMock.mock.calls.filter(
        ([url, opt]) => url.includes('/api/learner/mastery') && opt?.method === 'POST',
      );
      expect(postCalls.length).toBe(1);
      const postBody = JSON.parse(postCalls[0][1].body);
      expect(postBody.score).toBe(0.85);
    });

    it('resolves conflicts via Last-Write-Wins (LWW): Server wins if server is newer', async () => {
      const learnerId = 'learner_test_1';
      const conceptId = 'sci-c5-cell-wall';
      const localTime = new Date('2026-10-13T10:00:00Z').toISOString();
      const newerServerTime = new Date('2026-10-13T14:00:00Z').toISOString();

      await enqueueOfflineItem(
        'mastery_update',
        learnerId,
        { conceptId, score: 0.4 },
        conceptId,
      );

      const queue = await getOfflineQueue();
      queue[0].createdAt = localTime;

      const fetchMock = vi.fn().mockImplementation((url: string, options?: RequestInit) => {
        if (url.includes('/api/learner/mastery') && options?.method !== 'POST') {
          // Server has newer record with higher score from another session
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              mastery: {
                conceptId,
                score: 0.95,
                lastSeen: newerServerTime,
                attempts: 3,
                nextReviewAt: null,
              },
            }),
          });
        }
        return Promise.resolve({ ok: true, json: async () => ({}) });
      });

      global.fetch = fetchMock;

      const syncResult = await syncOfflineQueueToServer(learnerId);
      expect(syncResult.success).toBe(true);
      expect(syncResult.syncedCount).toBe(1);
      expect(syncResult.conflictsResolved).toBe(1); // Server won, conflict resolved!

      // Local mastery in IndexedDB/cache should be updated to server's 0.95
      const updatedLocal = await getLocalMastery(learnerId, conceptId);
      expect(updatedLocal?.score).toBe(0.95);
    });

    it('processes queued doubts through the agentic tutor turn and learner doubts table', async () => {
      const learnerId = 'learner_test_1';
      await enqueueOfflineItem(
        'doubt',
        learnerId,
        { text: 'କୋଷ ଝିଲ୍ଲୀ କ’ଣ?', language: 'or-IN' },
        'sci-c5-cell-membrane',
      );

      const fetchMock = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/learner/doubts')) {
          return Promise.resolve({
            ok: true,
            status: 201,
            json: async () => ({ id: 'doubt_123', status: 'created' }),
          });
        }
        if (url.includes('/api/tutor/turn')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ turnId: 'turn_456', outcome: 'lesson_generated' }),
          });
        }
        return Promise.resolve({ ok: true, json: async () => ({}) });
      });

      global.fetch = fetchMock;

      const syncResult = await syncOfflineQueueToServer(learnerId);
      expect(syncResult.success).toBe(true);
      expect(syncResult.syncedCount).toBe(1);
      expect(syncResult.processedDoubts).toContain('turn_456');

      const remainingQueue = await getOfflineQueue();
      expect(remainingQueue.length).toBe(0);
    });
  });

  describe('Local Ollama Offline Probe Fallback', () => {
    it('returns reachable: false gracefully when Ollama is offline or timed out', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

      const result = await probeOllama('http://localhost:11434');
      expect(result.reachable).toBe(false);
      expect(result.models).toEqual([]);
    });

    it('returns reachable: true with available models when Ollama is running', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          models: [{ name: 'llama3.2:latest' }, { name: 'qwen2.5:7b' }],
        }),
      });

      const result = await probeOllama('http://localhost:11434');
      expect(result.reachable).toBe(true);
      expect(result.models).toEqual(['llama3.2:latest', 'qwen2.5:7b']);
    });
  });
});
