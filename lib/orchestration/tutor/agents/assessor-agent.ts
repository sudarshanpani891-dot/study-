/**
 * Agent 6: Assessor Agent (Step 5)
 * Generates and evaluates adaptive practice:
 * - 3 questions per concept: 2 MCQ + 1 Short Answer
 * - Deterministic grading for MCQ
 * - LLM rubric for Short Answer (score, error_type, 2-sentence feedback, hint)
 * - EMA mastery updates (alpha = 0.35)
 * - Automatic re-planning trigger if score < 0.6
 */

import type { Queryable } from '@openmaic/storage/document/pg';
import type { DecisionTraceEvent } from '@/lib/server/learner/types';
import { updateMasteryWithEMA } from '@/lib/server/learner/repository';
import type {
  PracticeGradingResult,
  PracticeQuestion,
  PracticeState,
  TutorStateType,
} from '../state';
import { executeAgentLLM } from '../agent-llm';
import { getAgentLanguageDirective, normalizeLanguageCode } from '../language-prompts';
import { generateAdaptiveStudyPlan } from '../study-plan-engine';
import { CLASS_9_CURRICULUM } from '@/lib/matisathi/curriculum-kb';

interface QuestionGenerationLLMOutput {
  questions: Array<{
    id: string;
    type: 'mcq' | 'short_answer';
    questionText: string;
    options?: Array<{ id: string; text: string }>;
    correctOptionId?: string;
    modelAnswer?: string;
    rubricHint?: string;
  }>;
}

interface ShortAnswerRubricLLMOutput {
  score: number;
  error_type: 'misconception' | 'careless' | 'missing_prerequisite' | 'language_barrier';
  feedback: string;
  hint?: string;
  correctedIdea?: string;
}

function parseJsonSafe<T>(raw: string): T | null {
  if (!raw || !raw.trim()) return null;
  const stripped = raw
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/```json\s*|\s*```/g, '')
    .trim();

  try {
    return JSON.parse(stripped) as T;
  } catch {
    const match = stripped.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as T;
      } catch {
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const { jsonrepair } = require('jsonrepair');
          return JSON.parse(jsonrepair(match[0])) as T;
        } catch {
          return null;
        }
      }
    }
    return null;
  }
}

/**
 * Fallback questions if LLM fails or is rate-limited.
 */
function getCurriculumFallbackQuestions(
  conceptId: string,
  conceptNameOr: string,
  conceptNameEn: string,
  lang: string,
): PracticeQuestion[] {
  const isOdia = lang === 'or-IN';

  // 1. Check if curriculum knowledge base has authentic pre-written questions
  const capsule = CLASS_9_CURRICULUM.find(
    (c) =>
      c.id.includes(conceptId) ||
      c.topicNameEnglish.toLowerCase().includes(conceptNameEn.toLowerCase()),
  );

  if (capsule && capsule.quizQuestions && capsule.quizQuestions.length >= 2) {
    const q1 = capsule.quizQuestions[0];
    const q2 = capsule.quizQuestions[1];

    return [
      {
        id: `${conceptId}-q1`,
        type: 'mcq',
        questionText: isOdia ? q1.questionOdia : q1.questionOdia,
        options: q1.options.map((opt) => ({
          id: opt.id,
          text: isOdia ? opt.textOdia : opt.textOdia,
        })),
        correctOptionId: q1.correctOptionId,
        rubricHint: isOdia ? q1.explanationOdia : q1.explanationOdia,
      },
      {
        id: `${conceptId}-q2`,
        type: 'mcq',
        questionText: isOdia ? q2.questionOdia : q2.questionOdia,
        options: q2.options.map((opt) => ({
          id: opt.id,
          text: isOdia ? opt.textOdia : opt.textOdia,
        })),
        correctOptionId: q2.correctOptionId,
        rubricHint: isOdia ? q2.explanationOdia : q2.explanationOdia,
      },
      {
        id: `${conceptId}-q3`,
        type: 'short_answer',
        questionText: isOdia
          ? `${conceptNameOr} ର ଗୋଟିଏ ମୁଖ୍ୟ କାର୍ଯ୍ୟ ନିଜ ଭାଷାରେ ଲେଖ |`
          : `State one main function of ${conceptNameEn} in your own words.`,
        modelAnswer: isOdia
          ? `${conceptNameOr} କୋଷ କିମ୍ବା ବ୍ୟବସ୍ଥାରେ ଏକ ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ ସୁରକ୍ଷା ଓ ସନ୍ତୁଳନ ରକ୍ଷା କରେ |`
          : `${conceptNameEn} maintains essential structure and protection.`,
        rubricHint: 'Check for mention of core function or biological role.',
      },
    ];
  }

  // Generic fallback questions
  if (isOdia) {
    return [
      {
        id: `${conceptId}-q1`,
        type: 'mcq',
        questionText: `${conceptNameOr} ବିଷୟରେ ନିମ୍ନୋକ୍ତ ମଧ୍ୟରୁ କେଉଁଟି ସତ୍ୟ?`,
        options: [
          { id: 'a', text: `ଏହା କେବଳ ଉଦ୍ଭିଦ କୋଷରେ ଦେଖାଯାଏ |` },
          { id: 'b', text: `ଏହା କୋଷକୁ ନିର୍ଦ୍ଦିଷ୍ଟ ଆକାର ଓ ସୁରକ୍ଷା ପ୍ରଦାନ କରେ |` },
          { id: 'c', text: `ଏହାର କୌଣସି ଜୈବିକ ଭୂମିକା ନାହିଁ |` },
          { id: 'd', text: `ଏହା ଶକ୍ତି ଉତ୍ପାଦନ କରେ ନାହିଁ କିନ୍ତୁ ଆବରଣ ଅଟେ |` },
        ],
        correctOptionId: 'b',
      },
      {
        id: `${conceptId}-q2`,
        type: 'mcq',
        questionText: `${conceptNameOr} (${conceptNameEn}) କାହା ସହିତ ସିଧାସଳଖ ଜଡ଼ିତ?`,
        options: [
          { id: 'a', text: `ଜୈବିକ ସୁରକ୍ଷା ଓ ଗଠନ` },
          { id: 'b', text: `ରକ୍ତ ସଞ୍ଚାଳନ` },
          { id: 'c', text: `ଅମ୍ଳଜାନ ତ୍ୟାଗ` },
          { id: 'd', text: `ପୋଷକ ତତ୍ତ୍ୱ ବିଲୋପ` },
        ],
        correctOptionId: 'a',
      },
      {
        id: `${conceptId}-q3`,
        type: 'short_answer',
        questionText: `${conceptNameOr} କାହିଁକି ଜରୁରୀ, ୧-୨ ବାକ୍ୟରେ ବୁଝାଅ |`,
        modelAnswer: `${conceptNameOr} ସୁରକ୍ଷା ଓ ସ୍ଥିରତା ଦେବା ପାଇଁ ଅତ୍ୟନ୍ତ ଜରୁରୀ |`,
        rubricHint: 'Accurate mention of structural or functional significance.',
      },
    ];
  }

  return [
    {
      id: `${conceptId}-q1`,
      type: 'mcq',
      questionText: `Which of the following best describes ${conceptNameEn}?`,
      options: [
        { id: 'a', text: `It provides structural support and protection` },
        { id: 'b', text: `It has no defined biological function` },
        { id: 'c', text: `It only exists in artificial environments` },
        { id: 'd', text: `It acts as an external sensor only` },
      ],
      correctOptionId: 'a',
    },
    {
      id: `${conceptId}-q2`,
      type: 'mcq',
      questionText: `What is the primary role of ${conceptNameEn} in Class 9 Science?`,
      options: [
        { id: 'a', text: `Fundamental structural integrity` },
        { id: 'b', text: `Digestive enzyme secretion` },
        { id: 'c', text: `Optical reflection` },
        { id: 'd', text: `Thermal insulation only` },
      ],
      correctOptionId: 'a',
    },
    {
      id: `${conceptId}-q3`,
      type: 'short_answer',
      questionText: `Explain why ${conceptNameEn} is essential in 1-2 short sentences.`,
      modelAnswer: `${conceptNameEn} is essential because it maintains structure and regulation.`,
      rubricHint: 'Accurate concept explanation with functional keyword.',
    },
  ];
}

/**
 * Generates 3 practice questions for a concept.
 */
export async function generatePracticeQuestions(
  conceptId: string,
  conceptNameOr: string,
  conceptNameEn: string,
  language: string,
  portal?: string,
): Promise<{ questions: PracticeQuestion[]; fallbackUsed: boolean; latencyMs: number }> {
  const langCode = normalizeLanguageCode(language);
  const langDirective = getAgentLanguageDirective(langCode);

  const systemPrompt = `You are the Assessment Agent for MatiSathi (Class 9 Odisha Board).
Generate exactly 3 practice questions for the target concept:
- Question 1: MCQ (single correct answer among 4 choices: a, b, c, d)
- Question 2: MCQ (conceptual scenario among 4 choices: a, b, c, d)
- Question 3: Short Answer (requiring a 1-2 sentence response)

Strict Constraints:
1. Questions must be at Class 9 understanding level.
2. Written naturally in the target language (${langCode}).
3. Bracketed English terms once if technical terms appear.
${langDirective}

Output JSON format strictly:
{
  "questions": [
    {
      "id": "${conceptId}-q1",
      "type": "mcq",
      "questionText": "Question 1 text",
      "options": [
        {"id": "a", "text": "Option A"},
        {"id": "b", "text": "Option B"},
        {"id": "c", "text": "Option C"},
        {"id": "d", "text": "Option D"}
      ],
      "correctOptionId": "b",
      "rubricHint": "Explanation for why B is correct"
    },
    {
      "id": "${conceptId}-q2",
      "type": "mcq",
      "questionText": "Question 2 text",
      "options": [
        {"id": "a", "text": "Option A"},
        {"id": "b", "text": "Option B"},
        {"id": "c", "text": "Option C"},
        {"id": "d", "text": "Option D"}
      ],
      "correctOptionId": "a",
      "rubricHint": "Explanation for why A is correct"
    },
    {
      "id": "${conceptId}-q3",
      "type": "short_answer",
      "questionText": "Question 3 text asking for 1-2 sentences",
      "modelAnswer": "Expected 1-2 sentence answer",
      "rubricHint": "Key concept that student must mention"
    }
  ]
}`;

  const userPrompt = `Target Concept: "${conceptNameOr}" (${conceptNameEn}). Generate 3 Class 9 diagnostic questions.`;

  const fallbackHarness = () =>
    JSON.stringify({
      questions: getCurriculumFallbackQuestions(conceptId, conceptNameOr, conceptNameEn, langCode),
    });

  const llmResult = await executeAgentLLM({
    agentName: 'assessor',
    portal,
    modelType: 'cheap',
    system: systemPrompt,
    prompt: userPrompt,
    maxOutputTokens: 900,
    temperature: 0.2,
    fallbackGenerator: fallbackHarness,
    responseFormat: { type: 'json_object' },
  });

  const parsed = parseJsonSafe<QuestionGenerationLLMOutput>(llmResult.text);
  const questions =
    parsed?.questions && parsed.questions.length === 3
      ? (parsed.questions as PracticeQuestion[])
      : getCurriculumFallbackQuestions(conceptId, conceptNameOr, conceptNameEn, langCode);

  return {
    questions,
    fallbackUsed: llmResult.fallbackUsed,
    latencyMs: llmResult.ms,
  };
}

/**
 * Evaluates learner answers:
 * - Deterministic matching for MCQ questions
 * - LLM rubric grading for Short Answer
 * - Updates mastery table via EMA (alpha = 0.35)
 * - If score < 0.6, triggers adaptive re-planning
 */
export async function evaluatePracticeSubmission(
  queryable: Queryable,
  learnerId: string,
  conceptId: string,
  conceptNameOr: string,
  conceptNameEn: string,
  language: string,
  questions: PracticeQuestion[],
  learnerAnswers: Record<string, string>,
): Promise<{
  overallScore: number;
  questionScores: Record<string, number>;
  gradingResult: PracticeGradingResult;
  updatedMastery: { score: number; attempts: number; nextReviewAt: string | null };
  replanned: boolean;
  traces: DecisionTraceEvent[];
}> {
  const t0 = Date.now();
  const langCode = normalizeLanguageCode(language);
  const isOdia = langCode === 'or-IN';

  let totalScoreSum = 0;
  const questionScores: Record<string, number> = {};
  let shortAnswerScore = 0;
  let shortAnswerRubric: PracticeGradingResult = {
    score: 0.5,
    errorType: 'careless',
    feedback: isOdia
      ? 'ତୁମର ଉତ୍ତର ଭଲ ପ୍ରୟାସ ଥିଲା, ଆଉ ଟିକେ ସ୍ପଷ୍ଟ କରି ଲେଖ |'
      : 'Good attempt, try to be slightly more specific.',
    hint: isOdia ? 'ମୁଖ୍ୟ କାର୍ଯ୍ୟ ଉପରେ ଧ୍ୟାନ ଦିଅ |' : 'Focus on the main biological function.',
  };

  // 1. Grade MCQs deterministically
  for (const q of questions) {
    if (q.type === 'mcq') {
      const studentChoice = (learnerAnswers[q.id] || '').trim().toLowerCase();
      const isCorrect = studentChoice === (q.correctOptionId || '').trim().toLowerCase();
      const score = isCorrect ? 1.0 : 0.0;
      questionScores[q.id] = score;
      totalScoreSum += score;
    }
  }

  // 2. Grade Short Answer with LLM Rubric
  const shortAnswerQ = questions.find((q) => q.type === 'short_answer');
  if (shortAnswerQ) {
    const studentAnswer = (learnerAnswers[shortAnswerQ.id] || '').trim();

    if (studentAnswer.length < 3) {
      shortAnswerScore = 0.0;
      shortAnswerRubric = {
        score: 0.0,
        errorType: 'missing_prerequisite',
        feedback: isOdia
          ? 'କୌଣସି ଉତ୍ତର ମିଳିଲା ନାହିଁ | ଦୟାକରି ଏହି ଧାରଣାଟିକୁ ଆଉଥରେ ପଢ଼ |'
          : 'No answer was provided. Please review this concept once more.',
        hint: shortAnswerQ.rubricHint,
      };
    } else {
      const rubricPrompt = `You are the Expert Evaluator for Class 9 Science (Odisha Board).
Target Concept: "${conceptNameOr}" (${conceptNameEn})
Question: "${shortAnswerQ.questionText}"
Model Answer: "${shortAnswerQ.modelAnswer || ''}"
Key Requirement: "${shortAnswerQ.rubricHint || ''}"

Student's Answer: "${studentAnswer}"

Evaluate strictly using this rubric:
1. score: float between 0.0 and 1.0 (1.0 = fully correct understanding, 0.7 = mostly correct, 0.4 = partial/vague, 0.0 = completely incorrect or irrelevant).
2. error_type: one of ["misconception", "careless", "missing_prerequisite", "language_barrier"].
3. feedback: targeted 2-sentence empathetic correction in ${langCode}.
4. hint: actionable next step if score < 0.7.
5. correctedIdea: clear 1-sentence statement of correct scientific fact.

Output JSON only:
{
  "score": 0.8,
  "error_type": "careless",
  "feedback": "Two sentences in target language",
  "hint": "One short hint",
  "correctedIdea": "Scientific truth"
}`;

      const fallbackRubric = () =>
        JSON.stringify({
          score: 0.7,
          error_type: 'careless',
          feedback: isOdia
            ? 'ତୁମର ଧାରଣା ପ୍ରାୟ ଠିକ୍ ଅଛି, ମାତ୍ର ବୈଜ୍ଞାନିକ ଶବ୍ଦାବଳୀ ବ୍ୟବହାର କରିବା ଉଚିତ |'
            : 'Your understanding is largely correct, but try to use precise scientific terms.',
          hint: shortAnswerQ.rubricHint || 'ଧାରଣାକୁ ଆଉଥରେ ମନେ ପକାଅ |',
          correctedIdea: shortAnswerQ.modelAnswer || '',
        });

      const rubricLLM = await executeAgentLLM({
        agentName: 'assessor',
        portal: state.portal,
        modelType: 'premium', // llama-3.3-70b-versatile
        system: `You evaluate student answers accurately and empathetically. Output valid JSON only.`,
        prompt: rubricPrompt,
        maxOutputTokens: 350,
        temperature: 0.1,
        fallbackGenerator: fallbackRubric,
      });

      const parsed = parseJsonSafe<ShortAnswerRubricLLMOutput>(rubricLLM.text);
      if (parsed && typeof parsed.score === 'number') {
        shortAnswerScore = Math.max(0.0, Math.min(1.0, parsed.score));
        shortAnswerRubric = {
          score: shortAnswerScore,
          errorType: parsed.error_type || 'careless',
          feedback: parsed.feedback,
          hint: parsed.hint,
          correctedIdea: parsed.correctedIdea,
        };
      } else {
        shortAnswerScore = 0.6;
      }
    }

    questionScores[shortAnswerQ.id] = shortAnswerScore;
    totalScoreSum += shortAnswerScore;
  }

  const overallScore = Math.round((totalScoreSum / Math.max(1, questions.length)) * 100) / 100;

  // 3. Update mastery table via EMA (alpha = 0.35)
  const masteryUpdate = await updateMasteryWithEMA(
    queryable,
    learnerId,
    conceptId,
    overallScore,
    0.35,
  );

  // 4. If score < 0.6, trigger study plan re-planning (adds prerequisite review)
  let replanned = false;
  if (overallScore < 0.6) {
    try {
      await generateAdaptiveStudyPlan(queryable, learnerId, {
        language: langCode,
        triggerConceptId: conceptId,
        lastQuizScore: overallScore,
      });
      replanned = true;
    } catch (err) {
      console.warn('[AssessorAgent] Adaptive re-planning on low score encountered an issue:', err);
    }
  }

  const durationMs = Date.now() - t0;
  const trace: DecisionTraceEvent = {
    learnerId,
    turnId: `practice-eval-${Date.now()}`,
    agent: 'assessor',
    node: 'evaluatePractice',
    tool: 'evaluatePracticeSubmission',
    input: {
      conceptId,
      questionsCount: questions.length,
      learnerAnswers,
    },
    output: {
      overallScore,
      questionScores,
      previousMastery: masteryUpdate.previousScore,
      newMastery: masteryUpdate.newScore,
      replanned,
      errorType: shortAnswerRubric.errorType,
    },
    inputSummary: `Graded 3 practice questions for ${conceptNameEn}`,
    outputSummary: `Score: ${Math.round(overallScore * 100)}% (EMA: ${masteryUpdate.previousScore} -> ${masteryUpdate.newScore})`,
    reason:
      overallScore < 0.6
        ? `Score ${overallScore} < 0.6: triggered adaptive study plan re-route`
        : `Score ${overallScore} >= 0.6: mastery confirmed`,
    ms: durationMs,
    latencyMs: durationMs,
    status: 'success',
  };

  return {
    overallScore,
    questionScores,
    gradingResult: shortAnswerRubric,
    updatedMastery: {
      score: masteryUpdate.newScore,
      attempts: masteryUpdate.record.attempts,
      nextReviewAt: masteryUpdate.record.nextReviewAt,
    },
    replanned,
    traces: [trace],
  };
}

/**
 * LangGraph Node: Generates 3 practice questions and adds to state.
 */
export async function runAssessorAgent(state: TutorStateType): Promise<Partial<TutorStateType>> {
  const concept = state.detectedConcept;
  const conceptId = concept.id;
  const conceptNameOr = concept.nameOr;
  const conceptNameEn = concept.nameEn;
  const language = state.language;

  // Generate 3 diagnostic practice questions
  const { questions, fallbackUsed, latencyMs } = await generatePracticeQuestions(
    conceptId,
    conceptNameOr,
    conceptNameEn,
    language,
    state.portal,
  );

  const practiceState: PracticeState = {
    questions,
    learnerAnswers: null,
    gradingResults: null,
    gradedOverallScore: null,
  };

  const trace: DecisionTraceEvent = {
    learnerId: state.learnerId,
    turnId: state.turnId,
    agent: 'assessor',
    node: 'generatePractice',
    tool: 'generatePracticeQuestions',
    input: {
      conceptId,
      conceptNameEn,
      language,
    },
    output: {
      questionsCount: questions.length,
      fallbackUsed,
    },
    inputSummary: `Generated 3 diagnostic questions for ${conceptNameEn}`,
    outputSummary: `3 questions (2 MCQ + 1 Short Answer) prepared`,
    reason: `Preparing assessment for ${conceptNameEn}`,
    ms: latencyMs,
    latencyMs,
    status: 'success',
    fallbackUsed,
  };

  return {
    practice: practiceState,
    traces: [trace],
    nextAgent: 'followup',
  };
}
