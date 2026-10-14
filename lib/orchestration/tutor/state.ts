/**
 * MatiSathi Multi-Agent Orchestrator - Shared State
 * Fully typed LangGraph state supporting deterministic rule-based routing,
 * multi-lingual context, adaptive study plan, and comprehensive trace logging.
 */

import { Annotation } from '@langchain/langgraph';
import type { Queryable } from '@openmaic/storage/document/pg';
import type {
  DecisionTraceEvent,
  FollowupRecord,
  PlanItemRecord,
  StudyPlanRecord,
} from '@/lib/server/learner/types';

export interface LearnerProfileState {
  id: string;
  name: string | null;
  grade: string;
  board: string;
  language: string; // 'or-IN' | 'en' | 'hi'
  daily_minutes: number;
  exam_date: string | null;
}

export interface CurrentDoubtState {
  rawInput: string;
  inputMode: 'text' | 'voice';
  normalizedText: string;
  detectedLanguage: string;
  isSafe: boolean;
  rejectReason?: string;
  rejectionMessage?: string;
}

export interface DetectedConceptState {
  id: string;
  subject: string;
  chapter: string;
  nameOr: string;
  nameEn: string;
  prerequisites: string[];
  confidence: number;
  clarifyingQuestion?: string | null;
}

export interface MasterySnapshotState {
  score: number;
  attempts: number;
  lastSeen: string;
  nextReviewAt: string | null;
}

export interface PrerequisiteGap {
  conceptId: string;
  nameOr: string;
  nameEn: string;
  score: number;
  isMastered: boolean;
}

export type GapType = 'missing_prerequisite' | 'misconception' | 'needs_practice' | 'mastered';

export interface PlanState {
  action: 'explain' | 'revisit_prerequisite' | 'practice' | 'move_on' | 'revise';
  targetConceptId: string;
  targetConceptNameOr: string;
  targetConceptNameEn: string;
  reason: string;
  reasonLocalized: string;
  studyPlan?: StudyPlanRecord | null;
  todayPlanItems?: PlanItemRecord[];
}

export interface MicroLessonState {
  text: string;
  textEnglish?: string;
  analogyOrExample: string;
  technicalTerms: Array<{ inLanguage: string; inEnglish: string }>;
  wordCount: number;
  readingLevel: string;
  fallbackUsed: boolean;
}

export interface PracticeQuestion {
  id: string;
  type: 'mcq' | 'short_answer';
  questionText: string;
  options?: Array<{ id: string; text: string }>;
  correctOptionId?: string;
  modelAnswer?: string;
  rubricHint?: string;
}

export interface PracticeGradingResult {
  score: number; // 0.0 to 1.0
  errorType?: 'misconception' | 'careless' | 'missing_prerequisite' | 'language_barrier';
  feedback: string;
  hint?: string;
  correctedIdea?: string;
}

export interface PracticeState {
  questions: PracticeQuestion[];
  learnerAnswers?: Record<string, string> | null;
  gradingResults?: PracticeGradingResult | null;
  gradedOverallScore?: number | null;
}

export interface FollowupsState {
  scheduledFollowup?: FollowupRecord | null;
  dueFollowup?: FollowupRecord | null;
  dueFollowupHook?: string | null;
}

export interface LanguageGuardResult {
  approved: boolean;
  targetLanguage: string;
  wordCount: number;
  originalText: string;
  sanitizedText: string;
  regenerationTriggered: boolean;
}

// ==================== Root LangGraph State Annotation ====================

export const TutorState = Annotation.Root({
  // Turn execution context
  turnId: Annotation<string>,
  learnerId: Annotation<string>,
  queryable: Annotation<Queryable>,
  language: Annotation<string>, // 'or-IN' | 'en' | 'hi'
  portal: Annotation<string | undefined>,

  // Step 2: Shared typed state components
  learnerProfile: Annotation<LearnerProfileState>,
  currentDoubt: Annotation<CurrentDoubtState>,
  detectedConcept: Annotation<DetectedConceptState>,
  masterySnapshot: Annotation<MasterySnapshotState>,
  prerequisiteGaps: Annotation<PrerequisiteGap[]>,
  gapType: Annotation<GapType>,
  plan: Annotation<PlanState>,
  lesson: Annotation<MicroLessonState>,
  practice: Annotation<PracticeState>,
  gradingResults: Annotation<PracticeGradingResult | null>,
  followups: Annotation<FollowupsState>,
  languageGuard: Annotation<LanguageGuardResult | null>,

  // Supervisor loop & control
  loopCount: Annotation<number>,
  nextAgent: Annotation<string>,
  supervisorDecisionReason: Annotation<string>,
  finalAnswer: Annotation<string | null>,

  // Accumulated telemetry & errors
  traces: Annotation<DecisionTraceEvent[]>({
    reducer: (prev, update) => [...prev, ...update],
    default: () => [],
  }),
  errors: Annotation<string[]>({
    reducer: (prev, update) => [...prev, ...update],
    default: () => [],
  }),
});

export type TutorStateType = typeof TutorState.State;
