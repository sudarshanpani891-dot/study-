/**
 * Pedagogical Planner for the Agentic Tutor Loop
 * Deterministic decision engine for rural Odisha Class 9 students.
 */

export type PlanDecisionType = 'explain' | 'revisit_prerequisite' | 'quiz' | 'move_on';

export interface PrerequisiteStatus {
  id: string;
  nameOr: string;
  nameEn: string;
  score: number;
}

export interface PlannerInput {
  currentMasteryScore: number;
  currentAttempts: number;
  unmasteredPrerequisites: PrerequisiteStatus[];
  isDirectDoubt?: boolean;
  hasProvidedAnswers?: boolean;
}

export interface PlannerDecision {
  decision: PlanDecisionType;
  targetConceptId: string;
  targetConceptNameOr?: string;
  targetConceptNameEn?: string;
  reason: string;
  reasonOdia: string;
}

/**
 * Deterministic pedagogical decision function:
 * 1. If essential prerequisites have score < 0.5 and current mastery is low (< 0.6) -> 'revisit_prerequisite'
 * 2. If current mastery >= 0.8 and student is not asking a direct remedial doubt -> 'move_on'
 * 3. If student just submitted quiz answers OR concept is partially grasped (0.5 <= score < 0.8 and attempts >= 1) -> 'quiz'
 * 4. Otherwise (new concept, low score, direct doubt asked) -> 'explain'
 */
export function decidePedagogicalPlan(
  input: PlannerInput,
  currentConcept: { id: string; nameOr: string; nameEn: string },
  nextConcept?: { id: string; nameOr: string; nameEn: string },
): PlannerDecision {
  // 1. Check prerequisite gaps
  if (input.unmasteredPrerequisites.length > 0 && input.currentMasteryScore < 0.6) {
    const prereq = input.unmasteredPrerequisites[0];
    return {
      decision: 'revisit_prerequisite',
      targetConceptId: prereq.id,
      targetConceptNameOr: prereq.nameOr,
      targetConceptNameEn: prereq.nameEn,
      reason: `Prerequisite "${prereq.nameEn}" (${prereq.nameOr}) has not been mastered yet (score ${prereq.score.toFixed(2)}). Rebuilding foundation before advancing.`,
      reasonOdia: `ପୂର୍ବ ଆବଶ୍ୟକୀୟ ଧାରଣା "${prereq.nameOr}" ଏପର୍ଯ୍ୟନ୍ତ ସ୍ପଷ୍ଟ ହୋଇନାହିଁ (ଦକ୍ଷତା ${Math.round(prereq.score * 100)}%) | ମୂଳଦୁଆ ମଜବୁତ କରିବା ପାଇଁ ଏହାକୁ ପ୍ରଥମେ ବୁଝିବା |`,
    };
  }

  // 2. Check if concept is already mastered (score >= 0.8) and no direct confusion
  if (input.currentMasteryScore >= 0.8 && !input.isDirectDoubt) {
    const target = nextConcept ?? currentConcept;
    return {
      decision: 'move_on',
      targetConceptId: target.id,
      targetConceptNameOr: target.nameOr,
      targetConceptNameEn: target.nameEn,
      reason: `Concept "${currentConcept.nameEn}" is mastered with score ${input.currentMasteryScore.toFixed(2)}. Advancing learner to the next competency.`,
      reasonOdia: `ଧାରଣା "${currentConcept.nameOr}" ରେ ସମ୍ପୂର୍ଣ୍ଣ ଦକ୍ଷତା ହାସଲ ହୋଇଛି (${Math.round(input.currentMasteryScore * 100)}%) | ପରବର୍ତ୍ତୀ ବିଷୟକୁ ଅଗ୍ରସର ହେଉଛୁ |`,
    };
  }

  // 3. Check if ready for evaluation / quiz
  if (
    input.hasProvidedAnswers ||
    (input.currentMasteryScore >= 0.5 && input.currentAttempts >= 1 && !input.isDirectDoubt)
  ) {
    return {
      decision: 'quiz',
      targetConceptId: currentConcept.id,
      targetConceptNameOr: currentConcept.nameOr,
      targetConceptNameEn: currentConcept.nameEn,
      reason: `Concept "${currentConcept.nameEn}" is partially understood (score ${input.currentMasteryScore.toFixed(2)}, attempts ${input.currentAttempts}). Assessing active recall with a short quiz.`,
      reasonOdia: `ଧାରଣା "${currentConcept.nameOr}" ଉପରେ ଆଂଶିକ ବୁଝାମଣା ରହିଛି | ତୁମର ଜ୍ଞାନ ପରୀକ୍ଷା ପାଇଁ ୨-୩ଟି ପ୍ରଶ୍ନର ଅଭ୍ୟାସ କରିବା |`,
    };
  }

  // 4. Default: Explain with micro-lesson and rural analogy
  return {
    decision: 'explain',
    targetConceptId: currentConcept.id,
    targetConceptNameOr: currentConcept.nameOr,
    targetConceptNameEn: currentConcept.nameEn,
    reason: `Explaining "${currentConcept.nameEn}" with a Class 9 Odia micro-lesson (max 150 words) and everyday rural Odisha analogy.`,
    reasonOdia: `ନବମ ଶ୍ରେଣୀ ସ୍ତରର ସରଳ ଓଡ଼ିଆ ଏବଂ ଗ୍ରାମୀଣ ଉଦାହରଣ ମାଧ୍ୟମରେ "${currentConcept.nameOr}" ବୁଝାଉଛୁ |`,
  };
}
