/**
 * MatiSathi LangGraph Workflow
 * Deterministic LangGraph StateGraph with AI inside nodes.
 * Every tool call and reasoning step is logged to a visible decision trace.
 */

import { Annotation, StateGraph, START, END } from '@langchain/langgraph';
import type {
  CurriculumCapsule,
  ConceptMastery,
  DecisionTraceStep,
  PedagogicalStrategy,
  ProactiveNudge,
  StudentProfile,
  SubjectId,
  AgentLearningPlan,
  InteractiveQuizChallenge,
  HandsOnActionTask,
} from './types';
import {
  searchCurriculumKB,
  recordDiagnosticFinding,
  updateMasteryMatrix,
  selectPedagogicalStrategy,
  scheduleProactiveNudge,
} from './tools';
import { generatePedagogicalResponse } from './groq-client';
import { fetchLiveInternetKnowledge } from './web-knowledge';
import { DEFAULT_STUDENT_PROFILE, INITIAL_MASTERY_STATE, CLASS_9_CURRICULUM } from './curriculum-kb';

// ==================== LangGraph State Definition ====================

export const MatiSathiGraphState = Annotation.Root({
  // Inputs
  query: Annotation<string>,
  inputMode: Annotation<'voice' | 'text'>,
  studentProfile: Annotation<StudentProfile>,
  currentMastery: Annotation<Record<string, ConceptMastery>>,
  isOffline: Annotation<boolean>,

  // Internet Knowledge Context
  internetContext: Annotation<string>({
    reducer: (_, update) => update,
    default: () => '',
  }),
  internetSource: Annotation<string>({
    reducer: (_, update) => update,
    default: () => '',
  }),

  // Extracted & Retrieved
  detectedLanguage: Annotation<string>,
  detectedSubject: Annotation<SubjectId>,
  detectedTopicOdia: Annotation<string>,
  detectedTopicEnglish: Annotation<string>,
  matchedCapsule: Annotation<CurriculumCapsule>,

  // Diagnostic & Pedagogical State
  misconceptionFound: Annotation<boolean>,
  misconceptionDetails: Annotation<string | null>,
  masteryDelta: Annotation<number>,
  newMasteryScore: Annotation<number>,
  selectedStrategy: Annotation<PedagogicalStrategy>,

  // Generated Response & Adaptive Plan
  explanationOdia: Annotation<string>,
  explanationEnglish: Annotation<string>,
  englishKeywords: Annotation<string[]>({
    reducer: (_, update) => update,
    default: () => [],
  }),
  ruralMetaphor: Annotation<string>,
  prerequisites: Annotation<string[]>({
    reducer: (_, update) => update,
    default: () => [],
  }),
  learningPlan: Annotation<AgentLearningPlan | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),
  interactiveChallenge: Annotation<InteractiveQuizChallenge | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),
  actionTask: Annotation<HandsOnActionTask | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),

  // Proactive Followup
  proactiveNudge: Annotation<ProactiveNudge | null>,

  // Visible Decision Trace
  decisionTrace: Annotation<DecisionTraceStep[]>({
    reducer: (prev, update) => [...prev, ...update],
    default: () => [],
  }),
});

export type MatiSathiGraphStateType = typeof MatiSathiGraphState.State;

// ==================== Node 1: Ingest & Intent Normalizer ====================

async function ingestQueryNode(state: MatiSathiGraphStateType) {
  const start = Date.now();
  const raw = state.query.trim();

  // Detect script and language
  const hasOdiaScript = /[\u0B00-\u0B7F]/.test(raw);
  const detectedLanguage = hasOdiaScript ? 'Odia (ଓଡ଼ିଆ Script)' : 'Bilingual / Romanized Odia/Kui';

  // Detect potential subject hint
  let detectedSubject: SubjectId = 'Science';
  if (/gandhi|freedom|history|march|movement|war|british|empire|independence|dandi|ଇତିହାସ|ସ୍ୱାଧୀନତା/i.test(raw)) {
    detectedSubject = 'History';
  } else if (/river|water|dam|climate|monsoon|odisha|geography|mountain|weather|ନଦୀ|ଚିଲିକା|ହୀରାକୁଦ|ମୌସୁମୀ/i.test(raw)) {
    detectedSubject = 'Geography';
  } else if (/polynomial|fraction|number|triangle|geometry|math|algebra|pythagor|ସଂଖ୍ୟା|ଗଣିତ/i.test(raw)) {
    detectedSubject = 'Mathematics';
  } else if (/computer|internet|code|software|ai|phone|tech|ip address|router|technology|କମ୍ପ୍ୟୁଟର/i.test(raw)) {
    detectedSubject = 'Technology';
  } else if (/soil|crop|agriculture|fertilizer|farmer|farming|ଚାଷ|ଫସଲ|ମାଟି/i.test(raw)) {
    detectedSubject = 'Agriculture';
  }

  const step: DecisionTraceStep = {
    id: `trace-step-1-${Date.now()}`,
    stepIndex: 1,
    nodeName: 'ingest_query',
    title: 'Query Ingest & Language Normalization',
    titleOdia: 'ପ୍ରଶ୍ନ ବିଶ୍ଳେଷଣ ଓ ଭାଷା ନିରୂପଣ',
    actionType: 'state_transition',
    reasoning: `Normalized ${state.inputMode} input for learner. Detected ${detectedLanguage}, routed to subject domain: ${detectedSubject}.`,
    reasoningOdia: `ଶିକ୍ଷାର୍ଥୀଙ୍କ ${state.inputMode === 'voice' ? 'ଭଏସ୍ (କଣ୍ଠସ୍ୱର)' : 'ଟେକ୍ସଟ୍'} ପ୍ରଶ୍ନ ବିଶ୍ଳେଷଣ କରାଗଲା | ଭାଷା: ${detectedLanguage}, ବିଷୟ: ${detectedSubject}.`,
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - start,
  };

  return {
    detectedLanguage,
    detectedSubject,
    decisionTrace: [step],
  };
}

// ==================== Node 2: Curriculum Retrieval (Tool) ====================

async function retrieveCurriculumNode(state: MatiSathiGraphStateType) {
  const start = Date.now();

  // Call deterministic tool
  const result = searchCurriculumKB(state.query, state.detectedSubject);
  let capsule = { ...result.matchedCapsule };
  let internetContext = '';
  let internetSource = '';

  // If online, fetch live internet knowledge to ensure topic-specific real-world truth
  if (!state.isOffline) {
    try {
      const webKnowledge = await fetchLiveInternetKnowledge(state.query);
      if (webKnowledge && webKnowledge.extract) {
        internetContext = webKnowledge.extract;
        internetSource = webKnowledge.sourceName;
        if (webKnowledge.topicTitle && capsule.id.startsWith('dyn-')) {
          capsule.topicNameEnglish = webKnowledge.topicTitle;
          const hasOdia = /[\u0B00-\u0B7F]/.test(state.query);
          if (!hasOdia) {
            capsule.topicNameOdia = webKnowledge.topicTitle;
          }
        }
      }
    } catch (e) {
      console.warn('[retrieveCurriculumNode] Internet retrieval bypassed:', e);
    }
  }

  const isDynamic = capsule.id.startsWith('dyn-');
  const step: DecisionTraceStep = {
    id: `trace-step-2-${Date.now()}`,
    stepIndex: 2,
    nodeName: 'retrieve_curriculum',
    title: isDynamic ? 'Internet Knowledge & Topic Synthesis (Tool)' : 'Curriculum KB Retrieval (Tool)',
    titleOdia: isDynamic ? 'ଇଣ୍ଟରନେଟ୍ ତଥ୍ୟ ଓ ବିଷୟ ବିଶ୍ଳେଷଣ (Live Tool Call)' : 'ପାଠ୍ୟଖସଡ଼ା ତଥ୍ୟ ସନ୍ଧାନ (Tool Call)',
    actionType: 'tool_call',
    toolName: isDynamic ? 'fetchLiveInternetKnowledge' : 'searchCurriculumKB',
    toolInput: { query: state.query, preferredSubject: state.detectedSubject, isOnline: !state.isOffline },
    toolOutput: {
      capsuleId: capsule.id,
      topicOdia: capsule.topicNameOdia,
      topicEnglish: capsule.topicNameEnglish,
      confidence: result.confidence,
      matchedTerms: result.matchedTerms,
      internetSource: internetSource || 'Local Curriculum KB',
      snippet: internetContext.slice(0, 100),
    },
    reasoning: isDynamic
      ? `Retrieved real-world live internet context from ${internetSource || 'Wikipedia/Web'} for topic: "${capsule.topicNameEnglish}".`
      : `Matched Class 9 SCERT competency: "${capsule.topicNameEnglish}" (${capsule.chapterEnglish}) with confidence ${result.confidence.toFixed(2)}.`,
    reasoningOdia: isDynamic
      ? `ଇଣ୍ଟରନେଟ୍ (${internetSource || 'ୱେବ୍'}) ରୁ "${capsule.topicNameOdia}" ସମ୍ପର୍କରେ ତଥ୍ୟ ସଂଗ୍ରହ କରାଗଲା |`
      : `ଓଡ଼ିଶା ନବମ ଶ୍ରେଣୀ ପାଠ୍ୟଖସଡ଼ା ସହିତ ମେଳ କରାଗଲା: "${capsule.topicNameOdia}" | ଉଦାହରଣ ଉପଲବ୍ଧ: ${capsule.ruralAnalogy.metaphorTitleOdia}.`,
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - start,
  };

  return {
    matchedCapsule: capsule,
    detectedTopicOdia: capsule.topicNameOdia,
    detectedTopicEnglish: capsule.topicNameEnglish,
    internetContext,
    internetSource,
    decisionTrace: [step],
  };
}

// ==================== Node 3: Misconception Diagnosis (AI Node) ====================

async function diagnoseMisconceptionNode(state: MatiSathiGraphStateType) {
  const start = Date.now();
  const capsule = state.matchedCapsule;

  // Diagnostic tool execution
  const diagnostic = recordDiagnosticFinding(capsule, state.query);

  const step: DecisionTraceStep = {
    id: `trace-step-3-${Date.now()}`,
    stepIndex: 3,
    nodeName: 'diagnose_misconception',
    title: 'Cognitive Misconception Analysis (AI Diagnosis)',
    titleOdia: 'ଧାରଣାଗତ ତ୍ରୁଟି ପରୀକ୍ଷା (Cognitive Diagnosis)',
    actionType: 'ai_reasoning',
    toolName: 'recordDiagnosticFinding',
    toolInput: { capsuleId: capsule.id, studentQuery: state.query },
    toolOutput: {
      hasMisconception: diagnostic.hasMisconception,
      description: diagnostic.misconceptionDescriptionEnglish || 'None detected',
      severity: diagnostic.severity,
    },
    reasoning: diagnostic.hasMisconception
      ? `Detected entrenched misconception: "${diagnostic.misconceptionDescriptionEnglish}". Student conflated key boundaries.`
      : `No entrenched misconception detected. Standard comprehension doubt regarding "${capsule.topicNameEnglish}".`,
    reasoningOdia: diagnostic.hasMisconception
      ? `ଧାରଣାଗତ ସନ୍ଦେହ ଚିହ୍ନଟ ହେଲା: "${diagnostic.misconceptionDescriptionOdia}". ସଂଶୋଧନ ପାଇଁ ଗ୍ରାମୀଣ ଉଦାହରଣ ଆବଶ୍ୟକ |`
      : `କୌଣସି ଗୁରୁତର ଭ୍ରାନ୍ତ ଧାରଣା ନାହିଁ; ମୌଳିକ ସ୍ପଷ୍ଟୀକରଣ ଆବଶ୍ୟକ |`,
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - start,
  };

  return {
    misconceptionFound: diagnostic.hasMisconception,
    misconceptionDetails: diagnostic.misconceptionDescriptionOdia || null,
    decisionTrace: [step],
  };
}

// ==================== Node 4: Mastery Tracker (Deterministic Tool) ====================

async function updateMasteryNode(state: MatiSathiGraphStateType) {
  const start = Date.now();
  const capsule = state.matchedCapsule;

  const result = updateMasteryMatrix(
    state.currentMastery,
    capsule.id,
    state.misconceptionFound,
    false,
  );

  const step: DecisionTraceStep = {
    id: `trace-step-4-${Date.now()}`,
    stepIndex: 4,
    nodeName: 'update_mastery',
    title: 'Student Mastery Graph Update (Tool)',
    titleOdia: 'ଦକ୍ଷତା ସ୍କୋର ଅଦ୍ୟତନ (Mastery Update)',
    actionType: 'tool_call',
    toolName: 'updateMasteryMatrix',
    toolInput: {
      studentId: state.studentProfile.id,
      conceptId: capsule.id,
      hasMisconception: state.misconceptionFound,
    },
    toolOutput: {
      previousScore: result.previousScore,
      newScore: result.newScore,
      delta: result.delta,
      status: result.status,
    },
    reasoning: `Adjusted mastery for "${capsule.topicNameEnglish}" from ${result.previousScore}% to ${result.newScore}% (Δ+${result.delta}%). Status: ${result.status}.`,
    reasoningOdia: `ଦକ୍ଷତା ସ୍କୋର ${result.previousScore}% ରୁ ବୃଦ୍ଧି ପାଇ ${result.newScore}% ହେଲା (+${result.delta}%) | ସ୍ଥିତି: ${result.status}.`,
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - start,
  };

  return {
    masteryDelta: result.delta,
    newMasteryScore: result.newScore,
    decisionTrace: [step],
  };
}

// ==================== Node 5: Pedagogical Strategy Decider ====================

async function decidePedagogyNode(state: MatiSathiGraphStateType) {
  const start = Date.now();
  const capsule = state.matchedCapsule;

  const strategy = selectPedagogicalStrategy(
    state.misconceptionFound,
    state.newMasteryScore,
    state.studentProfile.eveningStudyMinutesRemaining,
  );

  const step: DecisionTraceStep = {
    id: `trace-step-5-${Date.now()}`,
    stepIndex: 5,
    nodeName: 'decide_pedagogy',
    title: 'Pedagogical Strategy Decider',
    titleOdia: 'ଶିକ୍ଷାଦାନ କୌଶଳ ନିଷ୍ପତ୍ତି (Pedagogy Selection)',
    actionType: 'state_transition',
    toolName: 'selectPedagogicalStrategy',
    toolInput: {
      hasMisconception: state.misconceptionFound,
      masteryScore: state.newMasteryScore,
      eveningMinutesLeft: state.studentProfile.eveningStudyMinutesRemaining,
    },
    toolOutput: { strategy, selectedMetaphor: capsule.ruralAnalogy.metaphorTitleOdia },
    reasoning: `Selected pedagogical strategy: "${strategy}". Anchoring to rural Odisha metaphor: "${capsule.ruralAnalogy.metaphorTitleEnglish}".`,
    reasoningOdia: `କୌଶଳ ମନୋନୀତ: "${strategy}" | ଗାଁ ଉଦାହରଣ ବ୍ୟବହାର ହେବ: "${capsule.ruralAnalogy.metaphorTitleOdia}".`,
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - start,
  };

  return {
    selectedStrategy: strategy,
    decisionTrace: [step],
  };
}

// ==================== Node 6: Response Synthesizer (AI Node) ====================

async function generateResponseNode(state: MatiSathiGraphStateType) {
  const start = Date.now();
  const capsule = state.matchedCapsule;

  // Execute Groq LLM completion with offline capsule fallback
  const result = await generatePedagogicalResponse({
    studentQuery: state.query,
    capsule,
    pedagogicalStrategy: state.selectedStrategy,
    misconceptionAlert: state.misconceptionDetails || undefined,
    isLowDataMode: state.studentProfile.lowDataMode,
    internetContext: state.internetContext,
    internetSource: state.internetSource,
  });

  const step: DecisionTraceStep = {
    id: `trace-step-6-${Date.now()}`,
    stepIndex: 6,
    nodeName: 'generate_response',
    title: 'Bilingual Odia Response Synthesizer (AI Node)',
    titleOdia: 'ଓଡ଼ିଆ ଭାଷା ଉତ୍ତର ପ୍ରସ୍ତୁତି (AI Node)',
    actionType: 'ai_reasoning',
    toolInput: {
      model: result.modelUsed,
      tokensUsed: result.usedTokens,
      strategy: state.selectedStrategy,
    },
    toolOutput: {
      explanationLength: result.explanationOdia.length,
      englishTerms: result.englishKeywords,
      durationMs: result.durationMs,
    },
    reasoning: `Synthesized universal pedagogical response via ${result.modelUsed} (${result.usedTokens} tokens, ${result.durationMs}ms) with 4-stage learning plan and practice challenges.`,
    reasoningOdia: `ସାର୍ବଜନୀନ ଶିକ୍ଷାଦାନ ପଦ୍ଧତି ଅନୁଯାୟୀ ଓଡ଼ିଆ ଓ ଇଂରାଜୀ ବ୍ୟାଖ୍ୟା, ୪-ସ୍ତରୀୟ ଯୋଜନା ଓ ଟାସ୍କ ପ୍ରସ୍ତୁତ କରାଗଲା (${result.durationMs}ms) |`,
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - start,
  };

  return {
    explanationOdia: result.explanationOdia,
    explanationEnglish: result.explanationEnglish,
    englishKeywords: result.englishKeywords,
    ruralMetaphor: result.ruralMetaphor,
    prerequisites: result.prerequisites,
    learningPlan: result.learningPlan,
    interactiveChallenge: result.interactiveChallenge,
    actionTask: result.actionTask,
    decisionTrace: [step],
  };
}

// ==================== Node 7: Proactive Follow-up Planner ====================

async function proactiveFollowupNode(state: MatiSathiGraphStateType) {
  const start = Date.now();
  const capsule = state.matchedCapsule;

  const nudge = scheduleProactiveNudge(capsule.id, capsule, state.misconceptionFound);

  const allocatedReview =
    state.learningPlan?.allocatedNextReviewDate ||
    'Tomorrow @ Evening Study Window (ଆସନ୍ତାକାଲି ସନ୍ଧ୍ୟା)';

  const step: DecisionTraceStep = {
    id: `trace-step-7-${Date.now()}`,
    stepIndex: 7,
    nodeName: 'proactive_followup',
    title: 'Adaptive Learning Plan & Spaced Review Allocator',
    titleOdia: 'ସ୍ୱୟଂଚାଳିତ ଶିକ୍ଷା ଯୋଜନା ଓ ସ୍ପେସ୍ଡ୍ ରିଭ୍ୟୁ ନିର୍ଦ୍ଧାରଣ',
    actionType: 'tool_call',
    toolName: 'scheduleProactiveNudge',
    toolInput: {
      studentId: state.studentProfile.id,
      conceptId: capsule.id,
      allocatedNextReview: allocatedReview,
    },
    toolOutput: {
      nudgeId: nudge.id,
      promptOdia: state.learningPlan?.followupChallengePromptOdia || nudge.nudgePromptOdia,
      challengeQuestionOdia: nudge.challengeQuestionOdia,
      allocatedReview,
      actionTaskAssigned: state.actionTask?.titleEnglish || 'Field exploration',
    },
    reasoning: `Goal pursuing agent allocated next spaced review for: "${allocatedReview}". Scheduled proactive follow-up and practice challenge.`,
    reasoningOdia: `ସ୍ୱୟଂଚାଳିତ ଏଜେଣ୍ଟ ପରବର୍ତ୍ତୀ ଅଧ୍ୟୟନ ପାଇଁ ସ୍ପେସ୍ଡ୍ ରିଭ୍ୟୁ ସ୍ଥିର କଲା: "${allocatedReview}" | ପରବର୍ତ୍ତୀ ଚ୍ୟାଲେଞ୍ଜ ନିର୍ଦ୍ଧାରିତ |`,
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - start,
  };

  return {
    proactiveNudge: nudge,
    decisionTrace: [step],
  };
}

// ==================== LangGraph Assembly ====================

export function buildMatiSathiGraph() {
  const workflow = new StateGraph(MatiSathiGraphState)
    .addNode('ingest_query', ingestQueryNode)
    .addNode('retrieve_curriculum', retrieveCurriculumNode)
    .addNode('diagnose_misconception', diagnoseMisconceptionNode)
    .addNode('update_mastery', updateMasteryNode)
    .addNode('decide_pedagogy', decidePedagogyNode)
    .addNode('generate_response', generateResponseNode)
    .addNode('proactive_followup', proactiveFollowupNode)
    .addEdge(START, 'ingest_query')
    .addEdge('ingest_query', 'retrieve_curriculum')
    .addEdge('retrieve_curriculum', 'diagnose_misconception')
    .addEdge('diagnose_misconception', 'update_mastery')
    .addEdge('update_mastery', 'decide_pedagogy')
    .addEdge('decide_pedagogy', 'generate_response')
    .addEdge('generate_response', 'proactive_followup')
    .addEdge('proactive_followup', END);

  return workflow.compile();
}

/**
 * Execute the deterministic LangGraph workflow for a student doubt
 */
export async function runMatiSathiWorkflow(params: {
  query: string;
  inputMode?: 'voice' | 'text';
  studentProfile?: StudentProfile;
  currentMastery?: Record<string, ConceptMastery>;
  isOffline?: boolean;
}) {
  const app = buildMatiSathiGraph();

  const initialState: Partial<MatiSathiGraphStateType> = {
    query: params.query,
    inputMode: params.inputMode || 'text',
    studentProfile: params.studentProfile || DEFAULT_STUDENT_PROFILE,
    currentMastery: params.currentMastery || INITIAL_MASTERY_STATE,
    isOffline: params.isOffline || false,
    matchedCapsule: CLASS_9_CURRICULUM[0],
    decisionTrace: [],
  };

  const finalState = await app.invoke(initialState);
  return finalState;
}
