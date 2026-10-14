/**
 * MatiSathi (ମାଟି ସାଥୀ) - Types & Data Models
 * Agentic EdTech for Regional Language & Geography
 * Nextech 2.0 Agentic AI Hackathon
 */

export interface StudentProfile {
  id: string;
  name: string;
  nameOdia: string;
  grade: string; // e.g. "All Learners (ସର୍ବସାଧାରଣ)", "Class 9", "Class 10", "College"
  learningGoal?: string;
  school: string;
  district: string; // e.g. "Cuttack", "Kandhamal", "Koraput", "Mayurbhanj"
  motherTongue: string; // "Kui / Odia"
  mediumOfInstruction: string; // "Odia with English technical terms"
  eveningStudyMinutesRemaining: number;
  lowDataMode: boolean;
  lastActiveDate: string;
}

export type MasteryStatus = 'not_started' | 'needs_remedial' | 'in_progress' | 'mastered';

export interface ConceptMastery {
  conceptId: string;
  subject: SubjectId;
  chapter: string;
  topicNameOdia: string;
  topicNameEnglish: string;
  masteryScore: number; // 0 - 100
  totalDoubtsAsked: number;
  lastStudiedAt: string;
  activeMisconceptions: string[];
  status: MasteryStatus;
}

export type ActionType = 'ai_reasoning' | 'tool_call' | 'state_transition';

export interface DecisionTraceStep {
  id: string;
  stepIndex: number;
  nodeName: string;
  title: string;
  titleOdia: string;
  actionType: ActionType;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolOutput?: Record<string, unknown>;
  reasoning: string;
  reasoningOdia: string;
  timestamp: string;
  durationMs: number;
}

export type PedagogicalStrategy =
  | 'rural_analogy'
  | 'socratic_hint'
  | 'step_by_step_definition'
  | 'retention_quiz'
  | 'advance_concept';

export interface CurriculumTerm {
  odia: string;
  english: string;
  explanationOdia: string;
}

export interface RuralAnalogy {
  metaphorTitleOdia: string;
  metaphorTitleEnglish: string;
  explanationOdia: string;
  explanationEnglish: string;
  localAnchor: string; // e.g., "ଗାଁ ମାଟି କାନ୍ଥ (Village Mud Wall)", "ମାଟି କଳସୀ (Earthen Pitcher)"
}

export interface MisconceptionRule {
  confusionOdia: string;
  confusionEnglish: string;
  clarificationOdia: string;
  clarificationEnglish: string;
  keywords: string[];
}

export type SubjectId =
  | 'Science'
  | 'Geography'
  | 'Mathematics'
  | 'Technology'
  | 'Agriculture'
  | 'History'
  | 'General Knowledge'
  | string;

export interface InteractiveTaskOption {
  id: string; // 'A', 'B', 'C', 'D'
  textOdia: string;
  textEnglish: string;
  isCorrect: boolean;
  explanationOdia: string;
  explanationEnglish: string;
}

export interface InteractiveQuizChallenge {
  id: string;
  questionOdia: string;
  questionEnglish: string;
  options: InteractiveTaskOption[];
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface HandsOnActionTask {
  id: string;
  titleOdia: string;
  titleEnglish: string;
  instructionsOdia: string;
  instructionsEnglish: string;
  expectedOutcomeOdia: string;
  expectedOutcomeEnglish: string;
}

export interface LearningPathwayStage {
  stageNumber: number;
  titleOdia: string;
  titleEnglish: string;
  descriptionOdia: string;
  descriptionEnglish: string;
  status: 'completed' | 'in_progress' | 'upcoming';
}

export interface AgentLearningPlan {
  goalSummaryOdia: string;
  goalSummaryEnglish: string;
  stages: LearningPathwayStage[];
  allocatedNextReviewDate: string;
  followupChallengePromptOdia: string;
  followupChallengePromptEnglish: string;
  nextStudyRecommendations?: Array<{
    conceptId: string;
    topicNameOdia: string;
    topicNameEnglish: string;
    reasonOdia: string;
    reasonEnglish: string;
    estimatedMinutes: number;
    timing: string;
  }>;
}

export interface LearnerDoubtRecord {
  id: string;
  query: string;
  subject: string;
  topicOdia: string;
  topicEnglish: string;
  timestamp: string;
  masteryScore: number;
  learningPlan?: AgentLearningPlan;
  interactiveChallenge?: InteractiveQuizChallenge;
  actionTask?: HandsOnActionTask;
  quizSolved: boolean;
  selectedOptionId?: string;
  taskCompleted: boolean;
  progressPercent: number; // 0 - 100%
  scheduledReviewDate: string;
  nextFollowupPromptOdia: string;
  nextFollowupPromptEnglish: string;
  whatToDoNextOdia: string;
  whatToDoNextEnglish: string;
}

export interface CurriculumCapsule {
  id: string;
  subject: SubjectId;
  chapterOdia: string;
  chapterEnglish: string;
  topicNameOdia: string;
  topicNameEnglish: string;
  summaryOdia: string;
  keyTerms: CurriculumTerm[];
  ruralAnalogy: RuralAnalogy;
  commonMisconceptions: MisconceptionRule[];
  examFocusPoints: string[];
}

export interface DoubtQueryRequest {
  studentId: string;
  queryText: string;
  inputMode: 'voice' | 'text';
  language?: 'odia' | 'english' | 'bilingual';
  isOffline?: boolean;
}

export interface ProactiveNudge {
  id: string;
  conceptId: string;
  topicNameOdia: string;
  topicNameEnglish: string;
  nudgePromptOdia: string;
  nudgePromptEnglish: string;
  challengeQuestionOdia: string;
  challengeQuestionEnglish: string;
  suggestedAnswerKeywords: string[];
  triggeredReason: string; // e.g. "Yesterday's struggle with Cell Wall vs Cell Membrane"
}

export interface AgentDoubtResponse {
  doubtId: string;
  queryText: string;
  detectedSubject: SubjectId;
  detectedTopicOdia: string;
  detectedTopicEnglish: string;
  prerequisites?: string[];
  explanationOdia: string;
  explanationEnglish: string;
  englishKeywords: string[];
  ruralMetaphorUsed?: string;
  misconceptionIdentified?: string;
  learningPlan?: AgentLearningPlan;
  interactiveChallenge?: InteractiveQuizChallenge;
  actionTask?: HandsOnActionTask;
  masteryDelta: number;
  updatedMasteryScore: number;
  pedagogicalStrategy: PedagogicalStrategy;
  proactiveNextStep: {
    promptOdia: string;
    promptEnglish: string;
    conceptId: string;
    scheduledFor?: string;
  };
  decisionTrace: DecisionTraceStep[];
  source: 'groq_ai' | 'offline_capsule';
}

export interface QueuedOfflineDoubt {
  id: string;
  timestamp: string;
  queryText: string;
  inputMode: 'voice' | 'text';
  responseSummaryOdia: string;
  conceptId: string;
  synced: boolean;
}

export interface SyncPayload {
  studentId: string;
  queuedDoubts: QueuedOfflineDoubt[];
  masteryUpdates: Record<string, ConceptMastery>;
}

export interface SyncResponse {
  success: boolean;
  syncedCount: number;
  timestamp: string;
  nextProactiveNudge: ProactiveNudge;
}
