/**
 * Learner Model - Types and Interfaces
 * Regional EdTech / MatiSathi - Class 9 Odisha Board
 */

export interface DeviceProfile {
  deviceModel?: string;
  screenType?: string;
  lowDataMode?: boolean;
  batteryOptimized?: boolean;
  offlineQueueLength?: number;
  connectionType?: '2g' | '3g' | '4g' | 'wifi' | 'offline';
  [key: string]: unknown;
}

export interface LearnerRecord {
  id: string;
  name: string | null;
  language: string;
  grade: string;
  board: string;
  dailyMinutes: number;
  examDate: string | null;
  deviceProfile: DeviceProfile;
  createdAt: string;
  updatedAt: string;
}

export interface ConceptRecord {
  id: string;
  subject: string;
  chapter: string;
  nameOr: string;
  nameEn: string;
  prerequisites: string[];
  createdAt: string;
}

export interface MasteryRecord {
  learnerId: string;
  conceptId: string;
  score: number; // 0.0 - 1.0
  attempts: number;
  lastSeen: string;
  nextReviewAt: string | null;
}

export interface DoubtRecord {
  id: string;
  learnerId: string;
  text: string;
  language: string;
  detectedConceptId: string | null;
  resolved: boolean;
  createdAt: string;
}

export type FollowupKind = 'recheck' | 'revise' | 'prerequisite' | 'streak';

export interface FollowupRecord {
  id: string;
  learnerId: string;
  conceptId: string;
  dueAt: string;
  kind: FollowupKind | string;
  status: 'pending' | 'completed' | 'dismissed' | string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export type PlanItemType = 'learn' | 'practice' | 'revise';
export type PlanItemStatus = 'pending' | 'completed' | 'skipped';

export interface StudyPlanRecord {
  id: string;
  learnerId: string;
  dailyMinutes: number;
  examDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlanItemRecord {
  id: string;
  planId: string;
  learnerId: string;
  conceptId: string;
  scheduledDate: string; // YYYY-MM-DD
  minutes: number;
  type: PlanItemType;
  status: PlanItemStatus;
  reason: string;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface SeedConceptInput {
  id: string;
  subject: string;
  chapter: string;
  nameOr: string;
  nameEn: string;
  prerequisites: string[];
}

export interface DecisionTraceEvent {
  id?: string;
  learnerId: string;
  turnId: string;
  agent: string;
  node: string;
  tool: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  inputSummary?: string;
  outputSummary?: string;
  reason: string;
  ms: number;
  latencyMs?: number;
  status?: 'success' | 'failure' | 'fallback' | string;
  fallbackUsed?: boolean;
  createdAt?: string;
}


