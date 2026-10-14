/**
 * Agentic Tutor Loop — Deterministic LangGraph Workflow
 *
 * Topology:
 *   START → intake → understand → diagnose → plan → teach → check → update → followup_scheduler → END
 *
 * Nodes:
 *   1) intake: takes doubt by text or transcribed voice, detects language, checks unprompted followups
 *   2) understand: maps doubt to a concept using concepts table as tools
 *   3) diagnose: checks mastery and prerequisites via getMastery tool
 *   4) plan: decides (explain / revisit prerequisite / quiz / move on)
 *   5) teach: generates short Odia micro-lesson (max 150 words + rural analogy)
 *   6) check: generates 2-3 question quiz, grades answers if provided
 *   7) update: writes mastery score, calculates spaced repetition interval
 *   8) followup_scheduler: schedules followup; provides unprompted opening hook on next session
 *
 * Trace & Resiliency Contract:
 *   - Every node emits a trace event { node, tool, input, output, reason, ms } stored in the DB.
 *   - Every tool call retries once on failure, then falls back to a cached/rule-based path.
 *   - Streaming chunks are written via config.writer() for real-time SSE delivery.
 */

import { Annotation, StateGraph, START, END } from '@langchain/langgraph';
import type { LangGraphRunnableConfig } from '@langchain/langgraph';
import type { Queryable } from '@openmaic/storage/document/pg';

import type { ConceptRecord, DecisionTraceEvent } from '@/lib/server/learner/types';
import {
  getConcept,
  listConcepts,
  recordDecisionTrace,
} from '@/lib/server/learner/repository';
import { decidePedagogicalPlan, type PlannerDecision } from './tutor/planner';
import {
  detectLanguageTool,
  diagnoseMasteryTool,
  generateMicroLessonTool,
  generateOrGradeQuizTool,
  mapDoubtToConceptTool,
  scheduleFollowupTool,
  updateMasteryTool,
  type QuizQuestion,
} from './tutor/tools';

// Re-export Multi-Agent Supervisor Orchestrator (Step 3)
export {
  createMultiAgentSupervisorGraph,
  buildInitialMultiAgentState,
  type TutorSSEChunk,
} from './tutor/supervisor-graph';

// ==================== SSE Streaming Event Interface ====================

export type TutorSSEEvent =
  | { type: 'trace'; data: DecisionTraceEvent }
  | { type: 'status'; data: { node: string; message: string; messageOdia: string } }
  | { type: 'teaching'; data: { textOdia: string; example: string; wordCount: number } }
  | {
      type: 'quiz';
      data: {
        questions: QuizQuestion[];
        gradedScore: number | null;
        feedbackOdia: string | null;
      };
    }
  | {
      type: 'followup';
      data: {
        followupId: string;
        dueAt: string;
        unpromptedHook?: string | null;
      };
    }
  | {
      type: 'done';
      data: {
        turnId: string;
        planDecision: string;
        targetConceptId: string;
        masteryScore: number;
        totalMs: number;
      };
    };

// ==================== LangGraph State Annotation ====================

export const TutorState = Annotation.Root({
  // Request metadata & dependencies
  turnId: Annotation<string>,
  learnerId: Annotation<string>,
  rawInput: Annotation<string>,
  inputMode: Annotation<'voice' | 'text'>,
  providedAnswers: Annotation<Record<string, string> | null>,
  explicitConceptId: Annotation<string | null>,
  queryable: Annotation<Queryable>,

  // Node 1: intake
  detectedLanguage: Annotation<string>,
  normalizedDoubt: Annotation<string>,
  unpromptedFollowupHook: Annotation<string | null>,

  // Node 2: understand
  detectedConceptId: Annotation<string>,
  detectedConceptNameOr: Annotation<string>,
  detectedConceptNameEn: Annotation<string>,
  chapter: Annotation<string>,
  understandConfidence: Annotation<number>,

  // Node 3: diagnose
  currentMasteryScore: Annotation<number>,
  currentAttempts: Annotation<number>,
  prerequisites: Annotation<string[]>,
  unmasteredPrerequisites: Annotation<
    Array<{ id: string; nameOr: string; nameEn: string; score: number }>
  >,
  isMastered: Annotation<boolean>,

  // Node 4: plan
  planDecision: Annotation<PlannerDecision['decision']>,
  targetConceptId: Annotation<string>,
  targetConceptNameOr: Annotation<string>,
  targetConceptNameEn: Annotation<string>,
  planReason: Annotation<string>,

  // Node 5: teach
  lessonTextOdia: Annotation<string>,
  lessonExample: Annotation<string>,
  lessonWordCount: Annotation<number>,

  // Node 6: check
  quizQuestions: Annotation<QuizQuestion[]>,
  previousQuizScore: Annotation<number | null>,
  previousQuizFeedbackOdia: Annotation<string | null>,

  // Node 7: update
  updatedMasteryScore: Annotation<number>,
  updatedAttempts: Annotation<number>,
  nextReviewAt: Annotation<string>,

  // Node 8: followup_scheduler
  scheduledFollowupId: Annotation<string>,
  followupDueAt: Annotation<string>,

  // Traces accumulated
  traces: Annotation<DecisionTraceEvent[]>({
    reducer: (prev, update) => [...prev, ...update],
    default: () => [],
  }),
});

export type TutorStateType = typeof TutorState.State;

// Helper to push trace event to database and SSE writer
async function recordAndEmitTrace(
  state: TutorStateType,
  config: LangGraphRunnableConfig,
  trace: DecisionTraceEvent,
): Promise<void> {
  // 1. Write to DB
  try {
    if (state.queryable) {
      await recordDecisionTrace(state.queryable, trace);
    }
  } catch (err) {
    console.warn('[TutorGraph] Failed to persist trace to DB:', err);
  }

  // 2. Stream chunk via LangGraph custom writer
  if (config.writer && typeof config.writer === 'function') {
    try {
      (config.writer as (chunk: TutorSSEEvent) => void)({
        type: 'trace',
        data: trace,
      });
    } catch {
      // Stream could be closed
    }
  }
}

function emitStatus(
  config: LangGraphRunnableConfig,
  node: string,
  message: string,
  messageOdia: string,
) {
  if (config.writer && typeof config.writer === 'function') {
    try {
      (config.writer as (chunk: TutorSSEEvent) => void)({
        type: 'status',
        data: { node, message, messageOdia },
      });
    } catch {
      // Stream could be closed
    }
  }
}

// ==================== Node 1: intake ====================

async function intakeNode(
  state: TutorStateType,
  config: LangGraphRunnableConfig,
): Promise<Partial<TutorStateType>> {
  emitStatus(config, 'intake', 'Processing student input...', 'ପ୍ରଶ୍ନ ଗ୍ରହଣ ଓ ଭାଷା ଚିହ୍ନଟ ଚାଲିଛି...');

  const { result, ms, fallbackUsed, error } = await detectLanguageTool(
    state.rawInput,
    state.inputMode,
  );

  const trace: DecisionTraceEvent = {
    learnerId: state.learnerId,
    turnId: state.turnId,
    node: 'intake',
    tool: 'detectLanguage',
    input: { rawInput: state.rawInput, inputMode: state.inputMode },
    output: {
      text: result.text,
      detectedLanguage: result.detectedLanguage,
      fallbackUsed,
      error,
    },
    reason: `Extracted ${state.inputMode} input for student. Detected language: ${result.detectedLanguage}.`,
    ms,
  };

  await recordAndEmitTrace(state, config, trace);

  return {
    normalizedDoubt: result.text,
    detectedLanguage: result.detectedLanguage,
    traces: [trace],
  };
}

// ==================== Node 2: understand ====================

async function understandNode(
  state: TutorStateType,
  config: LangGraphRunnableConfig,
): Promise<Partial<TutorStateType>> {
  emitStatus(config, 'understand', 'Mapping doubt to curriculum concept...', 'ପାଠ୍ୟଖସଡ଼ା ଧାରଣା ସହିତ ମେଳ କରାଯାଉଛି...');

  const concepts = state.queryable ? await listConcepts(state.queryable) : [];

  let chosenConceptId = state.explicitConceptId;
  let toolResult;

  if (chosenConceptId) {
    toolResult = {
      result: { conceptId: chosenConceptId, confidence: 1.0, reason: 'Explicit concept provided in request' },
      ms: 2,
      attempts: 1,
      fallbackUsed: false,
    };
  } else {
    toolResult = await mapDoubtToConceptTool(state.normalizedDoubt, concepts);
  }

  const { result, ms, fallbackUsed, error } = toolResult;
  const matched = concepts.find((c) => c.id === result.conceptId) ?? concepts[0] ?? {
    id: result.conceptId,
    nameOr: 'ଜୀବନର ମୌଳିକ ଏକକ (କୋଷ)',
    nameEn: 'The Fundamental Unit of Life',
    chapter: 'Chapter 5: The Fundamental Unit of Life (Cell)',
  };

  const trace: DecisionTraceEvent = {
    learnerId: state.learnerId,
    turnId: state.turnId,
    node: 'understand',
    tool: 'conceptMapper',
    input: { doubt: state.normalizedDoubt, explicitConceptId: state.explicitConceptId },
    output: {
      detectedConceptId: matched.id,
      nameOr: matched.nameOr,
      nameEn: matched.nameEn,
      chapter: matched.chapter,
      confidence: result.confidence,
      fallbackUsed,
      error,
    },
    reason: `Mapped student doubt to Class 9 concept "${matched.nameEn}" (${matched.nameOr}) with confidence ${result.confidence.toFixed(2)}. ${result.reason}`,
    ms,
  };

  await recordAndEmitTrace(state, config, trace);

  return {
    detectedConceptId: matched.id,
    detectedConceptNameOr: matched.nameOr,
    detectedConceptNameEn: matched.nameEn,
    chapter: matched.chapter,
    understandConfidence: result.confidence,
    traces: [trace],
  };
}

// ==================== Node 3: diagnose ====================

async function diagnoseNode(
  state: TutorStateType,
  config: LangGraphRunnableConfig,
): Promise<Partial<TutorStateType>> {
  emitStatus(config, 'diagnose', 'Checking concept mastery and prerequisites...', 'ଦକ୍ଷତା ଓ ପୂର୍ବ ଆବଶ୍ୟକୀୟ ଧାରଣା ଯାଞ୍ଚ ହେଉଛି...');

  const { result, ms, fallbackUsed, error } = await diagnoseMasteryTool(
    state.queryable,
    state.learnerId,
    state.detectedConceptId,
  );

  const trace: DecisionTraceEvent = {
    learnerId: state.learnerId,
    turnId: state.turnId,
    node: 'diagnose',
    tool: 'getMastery',
    input: { learnerId: state.learnerId, conceptId: state.detectedConceptId },
    output: {
      currentScore: result.currentScore,
      attempts: result.attempts,
      prerequisites: result.prerequisites,
      unmasteredPrerequisites: result.unmasteredPrerequisites,
      isMastered: result.isMastered,
      fallbackUsed,
      error,
    },
    reason: `Learner mastery for "${state.detectedConceptNameEn}": score=${result.currentScore.toFixed(2)}, attempts=${result.attempts}. Unmastered prerequisites: ${result.unmasteredPrerequisites.length}.`,
    ms,
  };

  await recordAndEmitTrace(state, config, trace);

  return {
    currentMasteryScore: result.currentScore,
    currentAttempts: result.attempts,
    prerequisites: result.prerequisites,
    unmasteredPrerequisites: result.unmasteredPrerequisites,
    isMastered: result.isMastered,
    traces: [trace],
  };
}

// ==================== Node 4: plan ====================

async function planNode(
  state: TutorStateType,
  config: LangGraphRunnableConfig,
): Promise<Partial<TutorStateType>> {
  emitStatus(config, 'plan', 'Formulating pedagogical action plan...', 'ଶିକ୍ଷଣ ପଦ୍ଧତି ନିର୍ଦ୍ଧାରଣ କରାଯାଉଛି...');
  const t0 = Date.now();

  const decision = decidePedagogicalPlan(
    {
      currentMasteryScore: state.currentMasteryScore,
      currentAttempts: state.currentAttempts,
      unmasteredPrerequisites: state.unmasteredPrerequisites,
      isDirectDoubt: Boolean(state.rawInput && state.rawInput.trim().length > 0 && !state.providedAnswers),
      hasProvidedAnswers: Boolean(state.providedAnswers && Object.keys(state.providedAnswers).length > 0),
    },
    {
      id: state.detectedConceptId,
      nameOr: state.detectedConceptNameOr,
      nameEn: state.detectedConceptNameEn,
    },
  );

  const ms = Date.now() - t0;

  const trace: DecisionTraceEvent = {
    learnerId: state.learnerId,
    turnId: state.turnId,
    node: 'plan',
    tool: 'pedagogicalPlanner',
    input: {
      masteryScore: state.currentMasteryScore,
      attempts: state.currentAttempts,
      unmasteredPrerequisitesCount: state.unmasteredPrerequisites.length,
      hasProvidedAnswers: Boolean(state.providedAnswers),
    },
    output: {
      planDecision: decision.decision,
      targetConceptId: decision.targetConceptId,
      targetConceptNameOr: decision.targetConceptNameOr,
      targetConceptNameEn: decision.targetConceptNameEn,
      reasonOdia: decision.reasonOdia,
    },
    reason: decision.reason,
    ms,
  };

  await recordAndEmitTrace(state, config, trace);

  return {
    planDecision: decision.decision,
    targetConceptId: decision.targetConceptId,
    targetConceptNameOr: decision.targetConceptNameOr ?? state.detectedConceptNameOr,
    targetConceptNameEn: decision.targetConceptNameEn ?? state.detectedConceptNameEn,
    planReason: decision.reason,
    traces: [trace],
  };
}

// ==================== Node 5: teach ====================

async function teachNode(
  state: TutorStateType,
  config: LangGraphRunnableConfig,
): Promise<Partial<TutorStateType>> {
  emitStatus(config, 'teach', 'Generating Odia micro-lesson with local analogy...', 'ସରଳ ଓଡ଼ିଆ ମାଇକ୍ରୋ-ପାଠ ଏବଂ ଉଦାହରଣ ପ୍ରସ୍ତୁତ ହେଉଛି...');

  const { result, ms, fallbackUsed, error } = await generateMicroLessonTool(
    state.targetConceptId,
    state.targetConceptNameOr,
    state.targetConceptNameEn,
  );

  const trace: DecisionTraceEvent = {
    learnerId: state.learnerId,
    turnId: state.turnId,
    node: 'teach',
    tool: 'generateMicroLesson',
    input: {
      targetConceptId: state.targetConceptId,
      planDecision: state.planDecision,
    },
    output: {
      lessonTextOdia: result.lessonTextOdia,
      lessonExample: result.lessonExample,
      wordCount: result.wordCount,
      fallbackUsed,
      error,
    },
    reason: `Generated Class 9 micro-lesson in simple Odia (${result.wordCount} words <= 150 limit) with rural Odisha analogy: "${result.lessonExample}".`,
    ms,
  };

  await recordAndEmitTrace(state, config, trace);

  // Emit teaching payload to client stream
  if (config.writer && typeof config.writer === 'function') {
    try {
      (config.writer as (chunk: TutorSSEEvent) => void)({
        type: 'teaching',
        data: {
          textOdia: result.lessonTextOdia,
          example: result.lessonExample,
          wordCount: result.wordCount,
        },
      });
    } catch {
      // Stream could be closed
    }
  }

  return {
    lessonTextOdia: result.lessonTextOdia,
    lessonExample: result.lessonExample,
    lessonWordCount: result.wordCount,
    traces: [trace],
  };
}

// ==================== Node 6: check ====================

async function checkNode(
  state: TutorStateType,
  config: LangGraphRunnableConfig,
): Promise<Partial<TutorStateType>> {
  emitStatus(config, 'check', 'Formulating check quiz & evaluating recall...', '୨-୩ଟି ପ୍ରଶ୍ନର ଅଭ୍ୟାସ କ୍ଵିଜ୍ ପ୍ରସ୍ତୁତ ହେଉଛି...');

  const { result, ms, fallbackUsed, error } = await generateOrGradeQuizTool(
    state.targetConceptId,
    state.providedAnswers,
  );

  const trace: DecisionTraceEvent = {
    learnerId: state.learnerId,
    turnId: state.turnId,
    node: 'check',
    tool: 'generateOrGradeQuiz',
    input: {
      targetConceptId: state.targetConceptId,
      providedAnswers: state.providedAnswers,
    },
    output: {
      questionsCount: result.questions.length,
      gradedScore: result.gradedScore,
      feedbackOdia: result.feedbackOdia,
      fallbackUsed,
      error,
    },
    reason: result.gradedScore !== null
      ? `Graded student answers: score=${result.gradedScore.toFixed(2)}. Feedback: ${result.feedbackOdia}`
      : `Generated ${result.questions.length}-question check quiz at Class 9 level for concept "${state.targetConceptNameEn}".`,
    ms,
  };

  await recordAndEmitTrace(state, config, trace);

  // Emit quiz payload to client stream
  if (config.writer && typeof config.writer === 'function') {
    try {
      (config.writer as (chunk: TutorSSEEvent) => void)({
        type: 'quiz',
        data: {
          questions: result.questions,
          gradedScore: result.gradedScore,
          feedbackOdia: result.feedbackOdia,
        },
      });
    } catch {
      // Stream could be closed
    }
  }

  return {
    quizQuestions: result.questions,
    previousQuizScore: result.gradedScore,
    previousQuizFeedbackOdia: result.feedbackOdia,
    traces: [trace],
  };
}

// ==================== Node 7: update ====================

async function updateNode(
  state: TutorStateType,
  config: LangGraphRunnableConfig,
): Promise<Partial<TutorStateType>> {
  emitStatus(config, 'update', 'Updating mastery matrix and calculating review interval...', 'ଦକ୍ଷତା ସ୍କୋର ଏବଂ ପରବର୍ତ୍ତୀ ଅନୁଶୀଳନ ତାରିଖ ଅଦ୍ୟତନ ହେଉଛି...');

  // Compute new mastery score
  let newScore = state.currentMasteryScore;
  if (state.previousQuizScore !== null) {
    // Blend prior score with quiz score
    newScore = Math.max(state.currentMasteryScore, state.currentMasteryScore * 0.4 + state.previousQuizScore * 0.6);
  } else if (state.planDecision === 'explain' || state.planDecision === 'revisit_prerequisite') {
    // Engagement / explanation baseline bump
    newScore = Math.max(state.currentMasteryScore, 0.45);
  } else if (state.planDecision === 'move_on') {
    newScore = Math.max(state.currentMasteryScore, 0.85);
  }

  // Spaced repetition review schedule
  // < 0.6: 1 day; 0.6..0.8: 3 days; >= 0.8: 7 days
  const nowMs = Date.now();
  let intervalDays = 1;
  if (newScore >= 0.8) {
    intervalDays = 7;
  } else if (newScore >= 0.6) {
    intervalDays = 3;
  }

  const nextReviewAt = new Date(nowMs + intervalDays * 86400000).toISOString();

  const { result, ms, fallbackUsed, error } = await updateMasteryTool(
    state.queryable,
    state.learnerId,
    state.targetConceptId,
    newScore,
    nextReviewAt,
  );

  const trace: DecisionTraceEvent = {
    learnerId: state.learnerId,
    turnId: state.turnId,
    node: 'update',
    tool: 'recordMastery',
    input: {
      targetConceptId: state.targetConceptId,
      calculatedScore: newScore,
      intervalDays,
    },
    output: {
      newScore: result.score,
      attempts: result.attempts,
      nextReviewAt,
      fallbackUsed,
      error,
    },
    reason: `Updated mastery for "${state.targetConceptNameEn}" to ${(result.score * 100).toFixed(0)}%. Scheduled spaced-repetition review in ${intervalDays} day(s) (${nextReviewAt}).`,
    ms,
  };

  await recordAndEmitTrace(state, config, trace);

  return {
    updatedMasteryScore: result.score,
    updatedAttempts: result.attempts,
    nextReviewAt,
    traces: [trace],
  };
}

// ==================== Node 8: followup_scheduler ====================

async function followupSchedulerNode(
  state: TutorStateType,
  config: LangGraphRunnableConfig,
): Promise<Partial<TutorStateType>> {
  emitStatus(config, 'followup_scheduler', 'Scheduling proactive review reminder...', 'ପରବର୍ତ୍ତୀ ଅଧିବେଶନ ପାଇଁ ଫଲୋ-ଅପ୍ ସୂଚୀ ପ୍ରସ୍ତୁତ ହେଉଛି...');

  const { result, ms, fallbackUsed, error } = await scheduleFollowupTool(
    state.queryable,
    state.learnerId,
    state.targetConceptId,
    state.targetConceptNameOr,
    state.targetConceptNameEn,
    state.nextReviewAt,
    {
      planDecision: state.planDecision,
      targetConceptId: state.targetConceptId,
      score: state.updatedMasteryScore,
      quizCount: state.quizQuestions.length,
    },
  );

  const trace: DecisionTraceEvent = {
    learnerId: state.learnerId,
    turnId: state.turnId,
    node: 'followup_scheduler',
    tool: 'scheduleFollowup',
    input: {
      targetConceptId: state.targetConceptId,
      dueAt: state.nextReviewAt,
    },
    output: {
      scheduledFollowupId: result.scheduledFollowup.id,
      unpromptedFollowupDue: result.unpromptedFollowupDue,
      fallbackUsed,
      error,
    },
    reason: `Scheduled followup task ${result.scheduledFollowup.id} due at ${state.nextReviewAt}. Unprompted past followups detected: ${result.unpromptedFollowupDue ? 'Yes' : 'No'}.`,
    ms,
  };

  await recordAndEmitTrace(state, config, trace);

  // Emit followup and done events
  if (config.writer && typeof config.writer === 'function') {
    try {
      const writer = config.writer as (chunk: TutorSSEEvent) => void;
      writer({
        type: 'followup',
        data: {
          followupId: result.scheduledFollowup.id,
          dueAt: state.nextReviewAt,
          unpromptedHook: result.unpromptedFollowupDue?.hookTextOdia ?? null,
        },
      });

      writer({
        type: 'done',
        data: {
          turnId: state.turnId,
          planDecision: state.planDecision,
          targetConceptId: state.targetConceptId,
          masteryScore: state.updatedMasteryScore,
          totalMs: state.traces.reduce((sum, t) => sum + (t.ms || 0), ms),
        },
      });
    } catch {
      // Stream could be closed
    }
  }

  return {
    scheduledFollowupId: result.scheduledFollowup.id,
    followupDueAt: state.nextReviewAt,
    unpromptedFollowupHook: result.unpromptedFollowupDue?.hookTextOdia ?? null,
    traces: [trace],
  };
}

// ==================== Graph Construction ====================

/**
 * Creates and compiles the deterministic 8-node LangGraph StateGraph.
 */
export function createTutorGraph() {
  const graph = new StateGraph(TutorState)
    .addNode('intake', intakeNode)
    .addNode('understand', understandNode)
    .addNode('diagnose', diagnoseNode)
    .addNode('plan', planNode)
    .addNode('teach', teachNode)
    .addNode('check', checkNode)
    .addNode('update', updateNode)
    .addNode('followup_scheduler', followupSchedulerNode)
    .addEdge(START, 'intake')
    .addEdge('intake', 'understand')
    .addEdge('understand', 'diagnose')
    .addEdge('diagnose', 'plan')
    .addEdge('plan', 'teach')
    .addEdge('teach', 'check')
    .addEdge('check', 'update')
    .addEdge('update', 'followup_scheduler')
    .addEdge('followup_scheduler', END);

  return graph.compile();
}

/**
 * Builds the initial graph state for a tutor turn.
 */
export function buildInitialTutorState(params: {
  turnId?: string;
  learnerId: string;
  query: string;
  inputMode?: 'voice' | 'text';
  providedAnswers?: Record<string, string> | null;
  conceptId?: string | null;
  queryable: Queryable;
}): TutorStateType {
  return {
    turnId: params.turnId ?? `turn_${Date.now()}`,
    learnerId: params.learnerId,
    rawInput: params.query,
    inputMode: params.inputMode ?? 'text',
    providedAnswers: params.providedAnswers ?? null,
    explicitConceptId: params.conceptId ?? null,
    queryable: params.queryable,

    detectedLanguage: 'or-IN',
    normalizedDoubt: params.query,
    unpromptedFollowupHook: null,

    detectedConceptId: '',
    detectedConceptNameOr: '',
    detectedConceptNameEn: '',
    chapter: '',
    understandConfidence: 0,

    currentMasteryScore: 0,
    currentAttempts: 0,
    prerequisites: [],
    unmasteredPrerequisites: [],
    isMastered: false,

    planDecision: 'explain',
    targetConceptId: '',
    targetConceptNameOr: '',
    targetConceptNameEn: '',
    planReason: '',

    lessonTextOdia: '',
    lessonExample: '',
    lessonWordCount: 0,

    quizQuestions: [],
    previousQuizScore: null,
    previousQuizFeedbackOdia: null,

    updatedMasteryScore: 0,
    updatedAttempts: 0,
    nextReviewAt: '',

    scheduledFollowupId: '',
    followupDueAt: '',

    traces: [],
  };
}
