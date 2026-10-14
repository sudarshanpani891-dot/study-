/**
 * Agent 3: Diagnostician Agent
 * Uses tools: getMastery, getPrerequisites, getRecentDoubts.
 * Outputs gap type:
 *   - missing_prerequisite (unmastered foundational concept < 0.6)
 *   - misconception (repeated confusion or low score on current concept)
 *   - needs_practice (score between 0.5 and 0.8)
 *   - mastered (score >= 0.8)
 */

import {
  getConcept,
  getMastery,
  listDoubts,
  type MasteryRecord,
} from '@/lib/server/learner/repository';
import type { DecisionTraceEvent } from '@/lib/server/learner/types';
import type { GapType, PrerequisiteGap, TutorStateType } from '../state';

export async function runDiagnosticianAgent(state: TutorStateType): Promise<Partial<TutorStateType>> {
  const t0 = Date.now();
  const conceptId = state.detectedConcept.id;
  const learnerId = state.learnerId;

  // 1. Tool 1: getMastery for the target concept
  let currentMastery: MasteryRecord | null = null;
  try {
    currentMastery = await getMastery(state.queryable, learnerId, conceptId);
  } catch (err) {
    console.warn('[Diagnostician] Failed to get mastery:', err);
  }

  const currentScore = currentMastery ? currentMastery.score : 0.0;
  const currentAttempts = currentMastery ? currentMastery.attempts : 0;
  const lastSeen = currentMastery ? currentMastery.lastSeen : new Date().toISOString();
  const nextReviewAt = currentMastery?.nextReviewAt ?? null;

  // 2. Tool 2: getPrerequisites check
  const prereqGaps: PrerequisiteGap[] = [];
  const prereqIds = state.detectedConcept.prerequisites || [];

  for (const pId of prereqIds) {
    try {
      const pMastery = await getMastery(state.queryable, learnerId, pId);
      const pScore = pMastery ? pMastery.score : 0.0;
      const isMastered = pScore >= 0.6;

      const pConcept = await getConcept(state.queryable, pId);
      prereqGaps.push({
        conceptId: pId,
        nameOr: pConcept?.nameOr || pId,
        nameEn: pConcept?.nameEn || pId,
        score: pScore,
        isMastered,
      });
    } catch {
      // Continue inspecting other prerequisites
    }
  }

  // 3. Tool 3: getRecentDoubts
  let recentDoubtsCount = 0;
  try {
    const recent = await listDoubts(state.queryable, learnerId, { limit: 5 });
    recentDoubtsCount = recent.filter((d) => d.detectedConceptId === conceptId).length;
  } catch {
    // Non-fatal
  }

  // 4. Determine Gap Type
  let gapType: GapType = 'needs_practice';
  const unmasteredPrereqs = prereqGaps.filter((p) => !p.isMastered);

  if (unmasteredPrereqs.length > 0 && currentScore < 0.6) {
    gapType = 'missing_prerequisite';
  } else if (currentScore >= 0.8) {
    gapType = 'mastered';
  } else if (recentDoubtsCount >= 2 || (currentAttempts >= 2 && currentScore < 0.5)) {
    gapType = 'misconception';
  } else if (currentAttempts > 0 && currentScore >= 0.4) {
    gapType = 'needs_practice';
  } else {
    gapType = 'none';
  }

  const trace: DecisionTraceEvent = {
    learnerId,
    turnId: state.turnId,
    agent: 'diagnostician',
    node: 'diagnose',
    tool: 'diagnoseKnowledgeGaps',
    input: {
      conceptId,
      currentScore,
      currentAttempts,
      prerequisitesCount: prereqIds.length,
      recentDoubtsCount,
    },
    output: {
      gapType,
      currentScore,
      unmasteredPrerequisites: unmasteredPrereqs.map((p) => ({ id: p.conceptId, score: p.score })),
    },
    inputSummary: `Mastery: ${(currentScore * 100).toFixed(0)}%, Prereqs: ${prereqIds.length}`,
    outputSummary: `Gap: ${gapType}${unmasteredPrereqs.length > 0 ? ` (${unmasteredPrereqs[0].nameEn})` : ''}`,
    reason: `Evaluated mastery ${(currentScore * 100).toFixed(0)}% and ${unmasteredPrereqs.length} unmastered prerequisites -> ${gapType}`,
    ms: Date.now() - t0,
    latencyMs: Date.now() - t0,
    status: 'success',
    fallbackUsed: false,
  };

  return {
    masterySnapshot: {
      score: currentScore,
      attempts: currentAttempts,
      lastSeen,
      nextReviewAt,
    },
    prerequisiteGaps: prereqGaps,
    gapType,
    traces: [trace],
    nextAgent: 'planner',
  };
}
