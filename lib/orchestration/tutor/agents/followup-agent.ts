/**
 * Agent 7: Follow-up Agent (Step 6)
 * Proactive spaced repetition scheduler:
 * - Schedules turn-end followups with spaced review (1d, 3d, 7d, 14d)
 * - Renders proactive on-open card: "Sunita, kal tame Photosynthesis padhithila — ebe 1 ta question try kariba?"
 * - Handles 'check_in', 'spru', and 'exam_prep' kinds
 * - No cron required: evaluation happens on portal load and turn end
 */

import type { Queryable } from '@openmaic/storage/document/pg';
import type { DecisionTraceEvent, FollowupKind, FollowupRecord } from '@/lib/server/learner/types';
import {
  createFollowup,
  getConcept,
  getDueFollowups,
  getLearner,
  getMastery,
  listFollowups,
} from '@/lib/server/learner/repository';
import type { FollowupsState, TutorStateType } from '../state';
import { normalizeLanguageCode } from '../language-prompts';

/**
 * Calculates spaced repetition interval in days based on mastery score:
 * - score < 0.6: 1 day (remedial check-in)
 * - 0.6 <= score < 0.8: 3 days (reinforcement)
 * - 0.8 <= score < 0.9: 7 days (retention check)
 * - score >= 0.9: 14 days (long-term mastery)
 */
export function calculateSpacedFollowupIntervalDays(score: number): {
  days: number;
  kind: FollowupKind;
} {
  if (score < 0.6) {
    return { days: 1, kind: 'check_in' };
  }
  if (score < 0.8) {
    return { days: 3, kind: 'spru' };
  }
  if (score < 0.9) {
    return { days: 7, kind: 'spru' };
  }
  return { days: 14, kind: 'exam_prep' };
}

/**
 * Generates an empathetic proactive card prompt in the learner's language.
 */
export function formatProactiveHook(
  learnerName: string,
  conceptNameInLang: string,
  conceptNameEn: string,
  language: string,
  kind: FollowupKind,
): string {
  const langCode = normalizeLanguageCode(language);
  const name = learnerName || (langCode === 'or-IN' ? 'ସାଥୀ' : 'Learner');

  if (langCode === 'or-IN') {
    if (kind === 'check_in') {
      return `${name}, କାଲି ତମେ "${conceptNameInLang}" ପଢ଼ିଥିଲ — ଏବେ ଗୋଟିଏ ପ୍ରଶ୍ନ ଚେଷ୍ଟା କରି ଦେଖିବା କି?`;
    }
    if (kind === 'spru') {
      return `${name}, "${conceptNameInLang} (${conceptNameEn})" ମନେ ଅଛି କି? ଚାଲ ୨ ମିନିଟରେ ଟିକେ ପୁନରାବୃତ୍ତି କରିବା |`;
    }
    return `${name}, ପରୀକ୍ଷା ପାଇଁ "${conceptNameInLang}" ର ଏକ ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ ପ୍ରଶ୍ନ ଅଭ୍ୟାସ କରିବା |`;
  }

  if (langCode === 'hi') {
    if (kind === 'check_in') {
      return `${name}, कल आपने "${conceptNameInLang}" पढ़ा था — अभी 1 सवाल हल करके देखें?`;
    }
    if (kind === 'spru') {
      return `${name}, क्या आपको "${conceptNameInLang} (${conceptNameEn})" याद है? 2 मिनट में रिवीज़न करते हैं!`;
    }
    return `${name}, परीक्षा के लिए "${conceptNameInLang}" का एक महत्वपूर्ण प्रश्न अभ्यास करें।`;
  }

  // English fallback
  if (kind === 'check_in') {
    return `${name}, you studied ${conceptNameEn} recently — would you like to try 1 quick question now?`;
  }
  if (kind === 'spru') {
    return `${name}, remember ${conceptNameEn}? Let's do a quick 2-minute memory check!`;
  }
  return `${name}, let's practice an important exam question for ${conceptNameEn}.`;
}

/**
 * Checks for due followups on portal load without requiring any background cron.
 */
export async function getDueFollowupCard(
  queryable: Queryable,
  learnerId: string,
  language = 'or-IN',
): Promise<{
  followup: FollowupRecord;
  proactiveHook: string;
  conceptName: string;
  conceptNameEn: string;
} | null> {
  const dueItems = await getDueFollowups(queryable, learnerId);
  if (dueItems.length === 0) {
    return null;
  }

  const prioritized = dueItems[0];
  const learner = await getLearner(queryable, learnerId);
  const concept = await getConcept(queryable, prioritized.conceptId);

  const learnerName = learner?.name || '';
  const conceptNameInLang =
    normalizeLanguageCode(language) === 'or-IN'
      ? concept?.nameOr || prioritized.conceptId
      : concept?.nameEn || prioritized.conceptId;
  const conceptNameEn = concept?.nameEn || prioritized.conceptId;

  const hook = formatProactiveHook(
    learnerName,
    conceptNameInLang,
    conceptNameEn,
    language,
    prioritized.kind || 'check_in',
  );

  return {
    followup: prioritized,
    proactiveHook: hook,
    conceptName: conceptNameInLang,
    conceptNameEn,
  };
}

/**
 * LangGraph Node: Follow-up Agent
 * Schedules a turn-end followup for the target concept and verifies due followups.
 */
export async function runFollowupAgent(state: TutorStateType): Promise<Partial<TutorStateType>> {
  const t0 = Date.now();
  const queryable = state.queryable;
  const learnerId = state.learnerId;
  const concept = state.detectedConcept;
  const conceptId = concept.id;
  const conceptNameOr = concept.nameOr;
  const conceptNameEn = concept.nameEn;
  const language = state.language;
  const learnerName = state.learnerProfile.name || '';

  // 1. Get current mastery score to determine spaced interval
  let currentScore = state.masterySnapshot.score;
  if (queryable) {
    try {
      const dbMastery = await getMastery(queryable, learnerId, conceptId);
      if (dbMastery) {
        currentScore = dbMastery.score;
      }
    } catch {
      // Use state snapshot
    }
  }

  const { days, kind } = calculateSpacedFollowupIntervalDays(currentScore);
  const dueAt = new Date(Date.now() + days * 24 * 3600 * 1000);

  const hookPrompt = formatProactiveHook(
    learnerName,
    conceptNameOr,
    conceptNameEn,
    language,
    kind,
  );

  let scheduledRecord: FollowupRecord | null = null;
  let dueFollowupCard: Awaited<ReturnType<typeof getDueFollowupCard>> = null;

  if (queryable) {
    try {
      scheduledRecord = await createFollowup(queryable, {
        learnerId,
        conceptId,
        dueAt,
        kind,
        status: 'pending',
        payload: {
          promptHook: hookPrompt,
          conceptNameOr,
          conceptNameEn,
          intervalDays: days,
          scheduledAfterTurn: state.turnId,
        },
      });

      dueFollowupCard = await getDueFollowupCard(queryable, learnerId, language);
    } catch (err) {
      console.warn('[FollowupAgent] Could not persist followup to database:', err);
    }
  }

  const followupsState: FollowupsState = {
    scheduledFollowup: scheduledRecord,
    dueFollowup: dueFollowupCard ? dueFollowupCard.followup : null,
    dueFollowupHook: dueFollowupCard ? dueFollowupCard.proactiveHook : null,
  };

  const durationMs = Date.now() - t0;
  const trace: DecisionTraceEvent = {
    learnerId,
    turnId: state.turnId,
    agent: 'followup',
    node: 'scheduleFollowup',
    tool: 'createFollowup',
    input: {
      conceptId,
      score: currentScore,
      intervalDays: days,
      kind,
    },
    output: {
      dueAt: dueAt.toISOString(),
      followupId: scheduledRecord?.id || 'simulated',
      hasDueFollowup: Boolean(dueFollowupCard),
    },
    inputSummary: `Schedule spaced followup for ${conceptNameEn} (+${days}d, ${kind})`,
    outputSummary: `Followup scheduled for ${dueAt.toISOString().split('T')[0]}`,
    reason: `Mastery score ${currentScore}: interval = ${days} days (${kind})`,
    ms: durationMs,
    latencyMs: durationMs,
    status: 'success',
  };

  return {
    followups: followupsState,
    traces: [trace],
    nextAgent: 'complete',
  };
}
