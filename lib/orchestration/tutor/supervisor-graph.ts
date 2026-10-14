/**
 * MatiSathi Multi-Agent Supervisor Orchestrator (Step 3)
 * Deterministic rule-based router with 8 discrete agents, looping (max 4),
 * PostgreSQL telemetry persistence, and SSE event streaming.
 */

import { StateGraph, START, END } from '@langchain/langgraph';
import type { LangGraphRunnableConfig } from '@langchain/langgraph';
import type { Queryable } from '@openmaic/storage/document/pg';
import { recordDecisionTrace } from '@/lib/server/learner/repository';
import type { DecisionTraceEvent } from '@/lib/server/learner/types';

import {
  TutorState,
  type CurrentDoubtState,
  type DetectedConceptState,
  type FollowupsState,
  type LearnerProfileState,
  type MasterySnapshotState,
  type MicroLessonState,
  type PlanState,
  type PracticeState,
  type TutorStateType,
} from './state';

import { runIntakeAgent } from './agents/intake-agent';
import { runConceptMapperAgent } from './agents/concept-mapper-agent';
import { runDiagnosticianAgent } from './agents/diagnostician-agent';
import { runPlannerAgent } from './agents/planner-agent';
import { runTutorAgent } from './agents/tutor-agent';
import { runLanguageGuardAgent } from './agents/language-guard-agent';
import { runAssessorAgent } from './agents/assessor-agent';
import { runFollowupAgent } from './agents/followup-agent';
import { getLocalizedStrings, normalizeLanguageCode } from './language-prompts';

// ==================== SSE Streaming Event Interface ====================

export type TutorSSEChunk =
  | { type: 'trace'; data: DecisionTraceEvent }
  | { type: 'status'; data: { node: string; agent: string; message: string; messageOdia: string } }
  | { type: 'teaching'; data: { text: string; example: string; wordCount: number } }
  | {
      type: 'quiz';
      data: {
        questions: unknown[];
        gradedScore?: number | null;
        feedback?: string | null;
      };
    }
  | {
      type: 'followup';
      data: {
        followupId?: string;
        dueAt?: string;
        unpromptedHook?: string | null;
      };
    }
  | {
      type: 'done';
      data: {
        turnId: string;
        planAction: string;
        targetConceptId: string;
        masteryScore: number;
        totalMs: number;
        loopCount: number;
      };
    };

/**
 * Helper to record traces to DB and emit to SSE stream
 */
async function handleNodeTraces(
  state: TutorStateType,
  config: LangGraphRunnableConfig,
  traces: DecisionTraceEvent[],
) {
  for (const trace of traces) {
    if (state.queryable) {
      try {
        await recordDecisionTrace(state.queryable, trace);
      } catch (err) {
        console.warn(`[Supervisor] Failed to record trace for agent ${trace.agent}:`, err);
      }
    }

    if (config.writer && typeof config.writer === 'function') {
      try {
        (config.writer as (chunk: TutorSSEChunk) => void)({
          type: 'trace',
          data: trace,
        });
      } catch {
        // stream may be closed
      }
    }
  }
}

function emitStatus(
  config: LangGraphRunnableConfig,
  node: string,
  agent: string,
  message: string,
  messageOdia: string,
) {
  if (config.writer && typeof config.writer === 'function') {
    try {
      (config.writer as (chunk: TutorSSEChunk) => void)({
        type: 'status',
        data: { node, agent, message, messageOdia },
      });
    } catch {
      // ignore
    }
  }
}

// ==================== Node Implementations ====================

async function intakeNode(
  state: TutorStateType,
  config: LangGraphRunnableConfig,
): Promise<Partial<TutorStateType>> {
  emitStatus(config, 'intake', 'intake', 'Normalizing doubt & verifying safety...', 'ପ୍ରଶ୍ନ ଯାଞ୍ଚ ହେଉଛି...');
  const result = await runIntakeAgent(state);
  if (result.traces) await handleNodeTraces(state, config, result.traces);
  return result;
}

async function conceptMapperNode(
  state: TutorStateType,
  config: LangGraphRunnableConfig,
): Promise<Partial<TutorStateType>> {
  emitStatus(config, 'concept_mapper', 'concept_mapper', 'Mapping doubt to curriculum...', 'ପାଠ୍ୟକ୍ରମ ସହିତ ଯୋଡ଼ାଯାଉଛି...');
  const result = await runConceptMapperAgent(state);
  if (result.traces) await handleNodeTraces(state, config, result.traces);
  return result;
}

async function diagnosticianNode(
  state: TutorStateType,
  config: LangGraphRunnableConfig,
): Promise<Partial<TutorStateType>> {
  emitStatus(config, 'diagnostician', 'diagnostician', 'Diagnosing prerequisites & mastery...', 'ପୂର୍ବ ଧାରଣା ଯାଞ୍ଚ କରାଯାଉଛି...');
  const result = await runDiagnosticianAgent(state);
  if (result.traces) await handleNodeTraces(state, config, result.traces);
  return result;
}

async function plannerNode(
  state: TutorStateType,
  config: LangGraphRunnableConfig,
): Promise<Partial<TutorStateType>> {
  emitStatus(config, 'planner', 'planner', 'Selecting pedagogical strategy...', 'ପାଠ ଯୋଜନା ପ୍ରସ୍ତୁତ ହେଉଛି...');
  const result = await runPlannerAgent(state);
  if (result.traces) await handleNodeTraces(state, config, result.traces);
  return result;
}

async function tutorNode(
  state: TutorStateType,
  config: LangGraphRunnableConfig,
): Promise<Partial<TutorStateType>> {
  emitStatus(config, 'tutor', 'tutor', 'Generating micro-lesson with local analogy...', 'ସରଳ ଉଦାହରଣ ସହ ବୁଝାଯାଉଛି...');
  const result = await runTutorAgent(state);
  if (result.traces) await handleNodeTraces(state, config, result.traces);

  if (result.lesson && config.writer && typeof config.writer === 'function') {
    try {
      (config.writer as (chunk: TutorSSEChunk) => void)({
        type: 'teaching',
        data: {
          text: result.lesson.text,
          example: result.lesson.analogyOrExample,
          wordCount: result.lesson.wordCount,
        },
      });
    } catch {
      // ignore
    }
  }

  return result;
}

async function languageGuardNode(
  state: TutorStateType,
  config: LangGraphRunnableConfig,
): Promise<Partial<TutorStateType>> {
  emitStatus(config, 'language_guard', 'language_guard', 'Validating language script & constraints...', 'ଭାଷା ଶୁଦ୍ଧତା ଯାଞ୍ଚ ହେଉଛି...');
  const result = await runLanguageGuardAgent(state);
  if (result.traces) await handleNodeTraces(state, config, result.traces);
  return result;
}

async function assessorNode(
  state: TutorStateType,
  config: LangGraphRunnableConfig,
): Promise<Partial<TutorStateType>> {
  emitStatus(config, 'assessor', 'assessor', 'Preparing practice questions & rubric...', 'ପ୍ରଶ୍ନ ପ୍ରସ୍ତୁତ କରାଯାଉଛି...');
  const result = await runAssessorAgent(state);
  if (result.traces) await handleNodeTraces(state, config, result.traces);

  if (result.practice && config.writer && typeof config.writer === 'function') {
    try {
      (config.writer as (chunk: TutorSSEChunk) => void)({
        type: 'quiz',
        data: {
          questions: result.practice.questions,
          gradedScore: result.practice.gradedOverallScore,
          feedback: result.practice.gradingResults?.feedback,
        },
      });
    } catch {
      // ignore
    }
  }

  // Check looping condition:
  // If grading results are present and score < 0.6, loop back to diagnostician (up to 4 loops max)
  const score = result.practice?.gradedOverallScore ?? state.practice?.gradedOverallScore;
  const currentLoop = state.loopCount || 0;

  if (typeof score === 'number' && score < 0.6) {
    if (currentLoop < 4) {
      return {
        ...result,
        loopCount: currentLoop + 1,
        nextAgent: 'diagnostician',
        supervisorDecisionReason: `Loop ${currentLoop + 1}/4 triggered: score ${score} < 0.6, re-diagnosing gaps.`,
      };
    } else {
      // Graceful exit to human-tutor escalation
      const langCode = normalizeLanguageCode(state.language);
      const escalationMsg =
        langCode === 'or-IN'
          ? '\n\n👨‍🏫 **ଧ୍ୟାନ ଦିଅ:** ଏହି ବିଷୟଟି ଟିକେ କଷ୍ଟକର ଥିବାରୁ, ଏହାକୁ ଆମର ଶିକ୍ଷକଙ୍କ ସହିତ ଆଲୋଚନା କରିବା ପାଇଁ ସୁପାରିଶ କରାଗଲା |'
          : '\n\n👨‍🏫 **Note:** This concept seems tricky; it has been flagged for human tutor assistance.';

      return {
        ...result,
        nextAgent: 'followup',
        finalAnswer: `${state.finalAnswer || ''}${escalationMsg}`,
        supervisorDecisionReason: `Max loops (4) reached. Escalating to human tutor.`,
      };
    }
  }

  return result;
}

async function followupNode(
  state: TutorStateType,
  config: LangGraphRunnableConfig,
): Promise<Partial<TutorStateType>> {
  emitStatus(config, 'followup', 'followup', 'Scheduling spaced follow-up...', 'ପୁନରାବୃତ୍ତି ସମୟ ଧାର୍ଯ୍ୟ ହେଉଛି...');
  const result = await runFollowupAgent(state);
  if (result.traces) await handleNodeTraces(state, config, result.traces);

  if (result.followups && config.writer && typeof config.writer === 'function') {
    try {
      (config.writer as (chunk: TutorSSEChunk) => void)({
        type: 'followup',
        data: {
          followupId: result.followups.scheduledFollowup?.id,
          dueAt: result.followups.scheduledFollowup?.dueAt,
          unpromptedHook: result.followups.dueFollowupHook,
        },
      });

      const totalMs = state.traces.reduce((sum, t) => sum + (t.latencyMs || t.ms || 0), 0);
      (config.writer as (chunk: TutorSSEChunk) => void)({
        type: 'done',
        data: {
          turnId: state.turnId,
          planAction: state.plan?.action || 'explain',
          targetConceptId: state.plan?.targetConceptId || state.detectedConcept?.id || '',
          masteryScore: state.masterySnapshot?.score || 0,
          totalMs,
          loopCount: state.loopCount || 0,
        },
      });
    } catch {
      // ignore
    }
  }

  return {
    ...result,
    nextAgent: 'complete',
  };
}

// ==================== Supervisor Deterministic Router ====================

function supervisorRouter(state: TutorStateType): string {
  const next = state.nextAgent;

  if (next === 'intake') return 'intake';
  if (next === 'concept_mapper') return 'concept_mapper';
  if (next === 'clarify' || next === 'reject') return END;
  if (next === 'diagnostician') return 'diagnostician';
  if (next === 'planner') return 'planner';
  if (next === 'tutor') return 'tutor';
  if (next === 'language_guard') return 'language_guard';
  if (next === 'assessor') return 'assessor';
  if (next === 'followup') return 'followup';
  if (next === 'complete') return END;

  return END;
}

// ==================== Graph Compilation ====================

export function createMultiAgentSupervisorGraph() {
  const graph = new StateGraph(TutorState)
    .addNode('intake', intakeNode)
    .addNode('concept_mapper', conceptMapperNode)
    .addNode('diagnostician', diagnosticianNode)
    .addNode('planner', plannerNode)
    .addNode('tutor', tutorNode)
    .addNode('language_guard', languageGuardNode)
    .addNode('assessor', assessorNode)
    .addNode('followup', followupNode)
    // Edges
    .addEdge(START, 'intake')
    .addConditionalEdges('intake', supervisorRouter)
    .addConditionalEdges('concept_mapper', supervisorRouter)
    .addConditionalEdges('diagnostician', supervisorRouter)
    .addConditionalEdges('planner', supervisorRouter)
    .addConditionalEdges('tutor', supervisorRouter)
    .addConditionalEdges('language_guard', supervisorRouter)
    .addConditionalEdges('assessor', supervisorRouter)
    .addConditionalEdges('followup', supervisorRouter);

  return graph.compile();
}

/**
 * Builds initial typed state for a supervisor turn.
 */
export function buildInitialMultiAgentState(params: {
  turnId?: string;
  learnerId: string;
  query: string;
  inputMode?: 'voice' | 'text';
  language?: string;
  portal?: string;
  learnerProfile?: Partial<LearnerProfileState>;
  explicitConceptId?: string | null;
  queryable: Queryable;
}): TutorStateType {
  const lang = normalizeLanguageCode(params.language || params.learnerProfile?.language || 'or-IN');

  const profile: LearnerProfileState = {
    id: params.learnerId,
    name: params.learnerProfile?.name ?? null,
    grade: params.learnerProfile?.grade ?? '9',
    board: params.learnerProfile?.board ?? 'BSE Odisha',
    language: lang,
    daily_minutes: params.learnerProfile?.daily_minutes ?? 60,
    exam_date: params.learnerProfile?.exam_date ?? null,
  };

  const currentDoubt: CurrentDoubtState = {
    rawInput: params.query,
    inputMode: params.inputMode ?? 'text',
    normalizedText: params.query.trim(),
    detectedLanguage: lang,
    isSafe: true,
  };

  const detectedConcept: DetectedConceptState = {
    id: params.explicitConceptId || '',
    subject: 'Science',
    chapter: '',
    nameOr: '',
    nameEn: '',
    prerequisites: [],
    confidence: params.explicitConceptId ? 1.0 : 0.0,
  };

  const masterySnapshot: MasterySnapshotState = {
    score: 0.0,
    attempts: 0,
    lastSeen: new Date().toISOString(),
    nextReviewAt: null,
  };

  const plan: PlanState = {
    action: 'explain',
    targetConceptId: params.explicitConceptId || '',
    targetConceptNameOr: '',
    targetConceptNameEn: '',
    reason: '',
    reasonLocalized: '',
  };

  const lesson: MicroLessonState = {
    text: '',
    analogyOrExample: '',
    technicalTerms: [],
    wordCount: 0,
    readingLevel: 'Class 9',
    fallbackUsed: false,
  };

  const practice: PracticeState = {
    questions: [],
    learnerAnswers: null,
    gradingResults: null,
    gradedOverallScore: null,
  };

  const followups: FollowupsState = {
    scheduledFollowup: null,
    dueFollowup: null,
    dueFollowupHook: null,
  };

  return {
    turnId: params.turnId ?? `turn_${Date.now()}`,
    learnerId: params.learnerId,
    queryable: params.queryable,
    language: lang,
    portal: params.portal || 'matisathi',

    learnerProfile: profile,
    currentDoubt,
    detectedConcept,
    masterySnapshot,
    prerequisiteGaps: [],
    gapType: 'needs_practice',
    plan,
    lesson,
    practice,
    gradingResults: null,
    followups,
    languageGuard: null,

    loopCount: 0,
    nextAgent: 'intake',
    supervisorDecisionReason: 'Turn initialized',
    finalAnswer: null,

    traces: [],
    errors: [],
  };
}
