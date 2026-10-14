/**
 * Agent 4: Planner Agent
 * Decides the pedagogical action (explain / revisit_prerequisite / practice / move_on / revise)
 * AND maintains the adaptive study plan (Step 4).
 */

import type { DecisionTraceEvent } from '@/lib/server/learner/types';
import type { PlanState, TutorStateType } from '../state';
import { generateAdaptiveStudyPlan } from '../study-plan-engine';
import { getLocalizedStrings, normalizeLanguageCode } from '../language-prompts';

export async function runPlannerAgent(state: TutorStateType): Promise<Partial<TutorStateType>> {
  const t0 = Date.now();
  const concept = state.detectedConcept;
  const gapType = state.gapType;
  const mastery = state.masterySnapshot;
  const prereqGaps = state.prerequisiteGaps;
  const langCode = normalizeLanguageCode(state.language);
  const localized = getLocalizedStrings(langCode);

  let action: PlanState['action'] = 'explain';
  let targetConceptId = concept.id;
  let targetConceptNameOr = concept.nameOr;
  let targetConceptNameEn = concept.nameEn;
  let reason = '';
  let reasonLocalized = '';

  const nameInLang = langCode === 'or-IN' ? concept.nameOr : concept.nameEn;

  // 1. Pedagogical Decision Logic
  if (gapType === 'missing_prerequisite' && prereqGaps.length > 0) {
    const unmastered = prereqGaps.find((p) => !p.isMastered) || prereqGaps[0];
    action = 'revisit_prerequisite';
    targetConceptId = unmastered.conceptId;
    targetConceptNameOr = unmastered.nameOr;
    targetConceptNameEn = unmastered.nameEn;
    reason = `Prerequisite foundation for "${unmastered.nameEn}" is below threshold (${(unmastered.score * 100).toFixed(0)}%). Rebuilding prerequisite before advancing.`;
    reasonLocalized = localized.prerequisiteReason(
      langCode === 'or-IN' ? unmastered.nameOr : unmastered.nameEn,
      unmastered.score,
    );
  } else if (gapType === 'mastered') {
    action = 'practice'; // reinforce with higher difficulty practice
    reason = `Concept "${concept.nameEn}" is mastered with ${(mastery.score * 100).toFixed(0)}%. Testing advanced recall.`;
    reasonLocalized = localized.masteredReason(nameInLang, mastery.score);
  } else if (gapType === 'needs_practice' || (mastery.score >= 0.5 && mastery.attempts >= 1)) {
    action = 'practice';
    reason = `Concept "${concept.nameEn}" is partially grasped. Generating practice assessment.`;
    reasonLocalized = localized.practiceReason(nameInLang);
  } else {
    action = 'explain';
    reason = `Direct doubt or new concept "${concept.nameEn}". Providing micro-lesson with rural Odia analogy.`;
    reasonLocalized = localized.explainReason(nameInLang);
  }

  // 2. Maintain adaptive study plan (Step 4)
  let generatedPlan = null;
  let todayItems = [];
  try {
    const planResult = await generateAdaptiveStudyPlan(state.queryable, state.learnerId, {
      language: state.language,
      triggerConceptId: concept.id,
    });
    generatedPlan = planResult.studyPlan;
    todayItems = planResult.todayItems;
  } catch (err) {
    console.warn('[PlannerAgent] Error generating study plan:', err);
  }

  const planState: PlanState = {
    action,
    targetConceptId,
    targetConceptNameOr,
    targetConceptNameEn,
    reason,
    reasonLocalized,
    studyPlan: generatedPlan,
    todayPlanItems: todayItems,
  };

  const trace: DecisionTraceEvent = {
    learnerId: state.learnerId,
    turnId: state.turnId,
    agent: 'planner',
    node: 'plan',
    tool: 'decidePedagogicalPlanAndSchedule',
    input: {
      gapType,
      currentScore: mastery.score,
      attempts: mastery.attempts,
      targetConceptId,
    },
    output: {
      action,
      targetConceptId,
      todayItemsCount: todayItems.length,
    },
    inputSummary: `Gap: ${gapType}, Action target: ${targetConceptNameEn}`,
    outputSummary: `Action: ${action} -> Target: ${targetConceptNameEn}`,
    reason,
    ms: Date.now() - t0,
    latencyMs: Date.now() - t0,
    status: 'success',
    fallbackUsed: false,
  };

  const nextAgent = 'tutor';

  return {
    plan: planState,
    traces: [trace],
    nextAgent,
  };
}
