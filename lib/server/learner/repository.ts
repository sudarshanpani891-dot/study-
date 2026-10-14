/**
 * Learner Model - Typed PostgreSQL Repository
 * Uses Queryable from @openmaic/storage/document/pg (no ORM).
 */

import { randomUUID } from 'node:crypto';

import type { Queryable } from '@openmaic/storage/document/pg';

import type {
  ConceptRecord,
  DecisionTraceEvent,
  DeviceProfile,
  DoubtRecord,
  FollowupKind,
  FollowupRecord,
  LearnerRecord,
  MasteryRecord,
  PlanItemRecord,
  PlanItemStatus,
  PlanItemType,
  StudyPlanRecord,
} from './types';


// Helper for parsing JSONB columns
function parseJson<T>(val: unknown, fallback: T): T {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string') {
    try {
      return JSON.parse(val) as T;
    } catch {
      return fallback;
    }
  }
  return val as T;
}

function toIsoString(val: unknown): string {
  if (!val) return new Date().toISOString();
  if (val instanceof Date) return val.toISOString();
  return new Date(val as string | number).toISOString();
}

function toOptionalIsoString(val: unknown): string | null {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString();
  return new Date(val as string | number).toISOString();
}

// ==========================================
// LEARNERS REPOSITORY
// ==========================================

interface LearnerRow extends Record<string, unknown> {
  id: string;
  name: string | null;
  language: string;
  grade: string;
  board?: string;
  daily_minutes?: number;
  exam_date?: unknown;
  device_profile: unknown;
  created_at: unknown;
  updated_at: unknown;
}

function mapLearnerRow(row: LearnerRow): LearnerRecord {
  return {
    id: row.id,
    name: row.name,
    language: row.language,
    grade: row.grade,
    board: typeof row.board === 'string' ? row.board : 'BSE Odisha',
    dailyMinutes: typeof row.daily_minutes === 'number' ? row.daily_minutes : 60,
    examDate: toOptionalIsoString(row.exam_date),
    deviceProfile: parseJson<DeviceProfile>(row.device_profile, {}),
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

export async function getLearner(
  queryable: Queryable,
  learnerId: string,
): Promise<LearnerRecord | null> {
  const result = await queryable.query<LearnerRow>(
    `SELECT id, name, language, grade, board, daily_minutes, exam_date, device_profile, created_at, updated_at
       FROM learners
      WHERE id = $1`,
    [learnerId],
  );
  if (result.rows.length === 0) return null;
  return mapLearnerRow(result.rows[0]);
}

export async function getOrCreateLearner(
  queryable: Queryable,
  learnerId: string,
  defaults?: {
    name?: string | null;
    language?: string;
    grade?: string;
    board?: string;
    dailyMinutes?: number;
    examDate?: string | Date | null;
    deviceProfile?: DeviceProfile;
  },
): Promise<LearnerRecord> {
  const existing = await getLearner(queryable, learnerId);
  if (existing) return existing;

  const name = defaults?.name ?? null;
  const language = defaults?.language ?? 'or-IN';
  const grade = defaults?.grade ?? 'Class 9';
  const board = defaults?.board ?? 'BSE Odisha';
  const dailyMinutes = defaults?.dailyMinutes ?? 60;
  const examDate = defaults?.examDate ? new Date(defaults.examDate).toISOString() : null;
  const deviceProfile = defaults?.deviceProfile ?? {};

  const result = await queryable.query<LearnerRow>(
    `INSERT INTO learners (id, name, language, grade, board, daily_minutes, exam_date, device_profile, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, now(), now())
     ON CONFLICT (id) DO UPDATE SET
       updated_at = now()
     RETURNING id, name, language, grade, board, daily_minutes, exam_date, device_profile, created_at, updated_at`,
    [learnerId, name, language, grade, board, dailyMinutes, examDate, JSON.stringify(deviceProfile)],
  );
  return mapLearnerRow(result.rows[0]);
}

export async function updateLearner(
  queryable: Queryable,
  learnerId: string,
  updates: {
    name?: string | null;
    language?: string;
    grade?: string;
    board?: string;
    dailyMinutes?: number;
    examDate?: string | Date | null;
    deviceProfile?: DeviceProfile;
  },
): Promise<LearnerRecord> {
  // Ensure the row exists first
  await getOrCreateLearner(queryable, learnerId);

  const fields: string[] = [];
  const params: unknown[] = [learnerId];
  let paramIndex = 2;

  if (updates.name !== undefined) {
    fields.push(`name = $${paramIndex++}`);
    params.push(updates.name);
  }
  if (updates.language !== undefined) {
    fields.push(`language = $${paramIndex++}`);
    params.push(updates.language);
  }
  if (updates.grade !== undefined) {
    fields.push(`grade = $${paramIndex++}`);
    params.push(updates.grade);
  }
  if (updates.board !== undefined) {
    fields.push(`board = $${paramIndex++}`);
    params.push(updates.board);
  }
  if (updates.dailyMinutes !== undefined) {
    fields.push(`daily_minutes = $${paramIndex++}`);
    params.push(updates.dailyMinutes);
  }
  if (updates.examDate !== undefined) {
    fields.push(`exam_date = $${paramIndex++}`);
    params.push(updates.examDate ? new Date(updates.examDate).toISOString() : null);
  }
  if (updates.deviceProfile !== undefined) {
    fields.push(`device_profile = $${paramIndex++}::jsonb`);
    params.push(JSON.stringify(updates.deviceProfile));
  }

  fields.push(`updated_at = now()`);

  const result = await queryable.query<LearnerRow>(
    `UPDATE learners
        SET ${fields.join(', ')}
      WHERE id = $1
  RETURNING id, name, language, grade, board, daily_minutes, exam_date, device_profile, created_at, updated_at`,
    params,
  );
  return mapLearnerRow(result.rows[0]);
}


// ==========================================
// CONCEPTS REPOSITORY
// ==========================================

interface ConceptRow extends Record<string, unknown> {
  id: string;
  subject: string;
  chapter: string;
  name_or: string;
  name_en: string;
  prerequisites: unknown;
  created_at: unknown;
}

function mapConceptRow(row: ConceptRow): ConceptRecord {
  return {
    id: row.id,
    subject: row.subject,
    chapter: row.chapter,
    nameOr: row.name_or,
    nameEn: row.name_en,
    prerequisites: parseJson<string[]>(row.prerequisites, []),
    createdAt: toIsoString(row.created_at),
  };
}

export async function listConcepts(
  queryable: Queryable,
  filter?: { subject?: string; chapter?: string },
): Promise<ConceptRecord[]> {
  const clauses: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (filter?.subject) {
    clauses.push(`subject = $${paramIdx++}`);
    params.push(filter.subject);
  }
  if (filter?.chapter) {
    clauses.push(`chapter = $${paramIdx++}`);
    params.push(filter.chapter);
  }

  const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const result = await queryable.query<ConceptRow>(
    `SELECT id, subject, chapter, name_or, name_en, prerequisites, created_at
       FROM concepts
       ${whereSql}
      ORDER BY chapter ASC, id ASC`,
    params,
  );
  return result.rows.map(mapConceptRow);
}

export async function getConcept(
  queryable: Queryable,
  conceptId: string,
): Promise<ConceptRecord | null> {
  const result = await queryable.query<ConceptRow>(
    `SELECT id, subject, chapter, name_or, name_en, prerequisites, created_at
       FROM concepts
      WHERE id = $1`,
    [conceptId],
  );
  if (result.rows.length === 0) return null;
  return mapConceptRow(result.rows[0]);
}

export async function upsertConcept(
  queryable: Queryable,
  concept: {
    id: string;
    subject: string;
    chapter: string;
    nameOr: string;
    nameEn: string;
    prerequisites?: string[];
  },
): Promise<ConceptRecord> {
  const result = await queryable.query<ConceptRow>(
    `INSERT INTO concepts (id, subject, chapter, name_or, name_en, prerequisites, created_at)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, now())
     ON CONFLICT (id) DO UPDATE SET
       name_or = EXCLUDED.name_or,
       name_en = EXCLUDED.name_en,
       chapter = EXCLUDED.chapter,
       subject = EXCLUDED.subject
     RETURNING id, subject, chapter, name_or, name_en, prerequisites, created_at`,
    [
      concept.id,
      concept.subject,
      concept.chapter,
      concept.nameOr,
      concept.nameEn,
      JSON.stringify(concept.prerequisites || []),
    ],
  );
  return mapConceptRow(result.rows[0]);
}

// ==========================================
// MASTERY REPOSITORY
// ==========================================

interface MasteryRow extends Record<string, unknown> {
  learner_id: string;
  concept_id: string;
  score: number;
  attempts: number;
  last_seen: unknown;
  next_review_at: unknown;
}

function mapMasteryRow(row: MasteryRow): MasteryRecord {
  return {
    learnerId: row.learner_id,
    conceptId: row.concept_id,
    score: Number(row.score),
    attempts: Number(row.attempts),
    lastSeen: toIsoString(row.last_seen),
    nextReviewAt: toOptionalIsoString(row.next_review_at),
  };
}

export async function getMastery(
  queryable: Queryable,
  learnerId: string,
  conceptId: string,
): Promise<MasteryRecord | null> {
  const result = await queryable.query<MasteryRow>(
    `SELECT learner_id, concept_id, score, attempts, last_seen, next_review_at
       FROM mastery
      WHERE learner_id = $1 AND concept_id = $2`,
    [learnerId, conceptId],
  );
  if (result.rows.length === 0) return null;
  return mapMasteryRow(result.rows[0]);
}

export async function listLearnerMastery(
  queryable: Queryable,
  learnerId: string,
): Promise<MasteryRecord[]> {
  const result = await queryable.query<MasteryRow>(
    `SELECT learner_id, concept_id, score, attempts, last_seen, next_review_at
       FROM mastery
      WHERE learner_id = $1
      ORDER BY last_seen DESC`,
    [learnerId],
  );
  return result.rows.map(mapMasteryRow);
}

export async function recordMasteryAttempt(
  queryable: Queryable,
  input: {
    learnerId: string;
    conceptId: string;
    score: number;
    nextReviewAt?: string | Date | null;
  },
): Promise<MasteryRecord> {
  // Ensure the learner exists to respect FK constraints
  await getOrCreateLearner(queryable, input.learnerId);

  // Clamp score between 0.0 and 1.0
  const clampedScore = Math.max(0.0, Math.min(1.0, Number(input.score) || 0.0));
  const nextReview = input.nextReviewAt ? new Date(input.nextReviewAt).toISOString() : null;

  const result = await queryable.query<MasteryRow>(
    `INSERT INTO mastery (learner_id, concept_id, score, attempts, last_seen, next_review_at)
     VALUES ($1, $2, $3, 1, now(), $4)
     ON CONFLICT (learner_id, concept_id) DO UPDATE SET
       score = EXCLUDED.score,
       attempts = mastery.attempts + 1,
       last_seen = now(),
       next_review_at = EXCLUDED.next_review_at
     RETURNING learner_id, concept_id, score, attempts, last_seen, next_review_at`,
    [input.learnerId, input.conceptId, clampedScore, nextReview],
  );
  return mapMasteryRow(result.rows[0]);
}

export async function updateMasteryWithEMA(
  queryable: Queryable,
  learnerId: string,
  conceptId: string,
  attemptScore: number,
  alpha = 0.35,
  nextReviewAt?: string | Date | null,
): Promise<{ record: MasteryRecord; previousScore: number; newScore: number }> {
  await getOrCreateLearner(queryable, learnerId);
  const existing = await getMastery(queryable, learnerId, conceptId);
  const previousScore = existing ? existing.score : 0.0;
  const clampedAttempt = Math.max(0.0, Math.min(1.0, attemptScore));
  const calculatedScore = existing
    ? previousScore * (1 - alpha) + clampedAttempt * alpha
    : clampedAttempt;
  const newScore = Math.max(0.0, Math.min(1.0, Math.round(calculatedScore * 100) / 100));

  let reviewDate = nextReviewAt;
  if (!reviewDate) {
    // Spaced repetition schedule based on new score:
    // score >= 0.8 -> 7 days; score >= 0.6 -> 3 days; score < 0.6 -> 1 day
    const daysToAdd = newScore >= 0.8 ? 7 : newScore >= 0.6 ? 3 : 1;
    reviewDate = new Date(Date.now() + daysToAdd * 24 * 3600 * 1000).toISOString();
  }

  const record = await recordMasteryAttempt(queryable, {
    learnerId,
    conceptId,
    score: newScore,
    nextReviewAt: reviewDate,
  });

  return { record, previousScore, newScore: record.score };
}

// ==========================================
// DOUBTS REPOSITORY
// ==========================================

interface DoubtRow extends Record<string, unknown> {
  id: string;
  learner_id: string;
  text: string;
  language: string;
  detected_concept_id: string | null;
  resolved: boolean;
  created_at: unknown;
}

function mapDoubtRow(row: DoubtRow): DoubtRecord {
  return {
    id: row.id,
    learnerId: row.learner_id,
    text: row.text,
    language: row.language,
    detectedConceptId: row.detected_concept_id,
    resolved: Boolean(row.resolved),
    createdAt: toIsoString(row.created_at),
  };
}

export async function createDoubt(
  queryable: Queryable,
  input: {
    id?: string;
    learnerId: string;
    text: string;
    language?: string;
    detectedConceptId?: string | null;
  },
): Promise<DoubtRecord> {
  await getOrCreateLearner(queryable, input.learnerId);

  const doubtId = input.id ?? `doubt_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
  const language = input.language ?? 'or-IN';
  const conceptId = input.detectedConceptId ?? null;

  const result = await queryable.query<DoubtRow>(
    `INSERT INTO doubts (id, learner_id, text, language, detected_concept_id, resolved, created_at)
     VALUES ($1, $2, $3, $4, $5, false, now())
     RETURNING id, learner_id, text, language, detected_concept_id, resolved, created_at`,
    [doubtId, input.learnerId, input.text, language, conceptId],
  );
  return mapDoubtRow(result.rows[0]);
}

export async function listDoubts(
  queryable: Queryable,
  learnerId: string,
  options?: { resolved?: boolean; limit?: number },
): Promise<DoubtRecord[]> {
  const clauses: string[] = ['learner_id = $1'];
  const params: unknown[] = [learnerId];
  let paramIdx = 2;

  if (options?.resolved !== undefined) {
    clauses.push(`resolved = $${paramIdx++}`);
    params.push(options.resolved);
  }

  const limitClause = options?.limit ? `LIMIT ${Math.max(1, Number(options.limit))}` : '';

  const result = await queryable.query<DoubtRow>(
    `SELECT id, learner_id, text, language, detected_concept_id, resolved, created_at
       FROM doubts
      WHERE ${clauses.join(' AND ')}
      ORDER BY created_at DESC
      ${limitClause}`,
    params,
  );
  return result.rows.map(mapDoubtRow);
}

export async function resolveDoubt(
  queryable: Queryable,
  doubtId: string,
  learnerId: string,
  resolved: boolean = true,
): Promise<DoubtRecord | null> {
  const result = await queryable.query<DoubtRow>(
    `UPDATE doubts
        SET resolved = $3
      WHERE id = $1 AND learner_id = $2
  RETURNING id, learner_id, text, language, detected_concept_id, resolved, created_at`,
    [doubtId, learnerId, resolved],
  );
  if (result.rows.length === 0) return null;
  return mapDoubtRow(result.rows[0]);
}

// ==========================================
// FOLLOWUPS REPOSITORY
// ==========================================

interface FollowupRow extends Record<string, unknown> {
  id: string;
  learner_id: string;
  concept_id: string;
  due_at: unknown;
  kind?: string;
  status: string;
  payload: unknown;
  created_at: unknown;
}

function mapFollowupRow(row: FollowupRow): FollowupRecord {
  return {
    id: row.id,
    learnerId: row.learner_id,
    conceptId: row.concept_id,
    dueAt: toIsoString(row.due_at),
    kind: (row.kind as FollowupKind) || 'recheck',
    status: row.status,
    payload: parseJson<Record<string, unknown>>(row.payload, {}),
    createdAt: toIsoString(row.created_at),
  };
}

export async function createFollowup(
  queryable: Queryable,
  input: {
    id?: string;
    learnerId: string;
    conceptId: string;
    dueAt: string | Date;
    kind?: FollowupKind | string;
    status?: string;
    payload?: Record<string, unknown>;
  },
): Promise<FollowupRecord> {
  await getOrCreateLearner(queryable, input.learnerId);

  const followupId = input.id ?? `fup_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
  const kind = input.kind ?? 'recheck';
  const status = input.status ?? 'pending';
  const dueAtIso = new Date(input.dueAt).toISOString();
  const payload = input.payload ?? {};

  const result = await queryable.query<FollowupRow>(
    `INSERT INTO followups (id, learner_id, concept_id, due_at, kind, status, payload, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, now())
     RETURNING id, learner_id, concept_id, due_at, kind, status, payload, created_at`,
    [followupId, input.learnerId, input.conceptId, dueAtIso, kind, status, JSON.stringify(payload)],
  );
  return mapFollowupRow(result.rows[0]);
}

export async function listFollowups(
  queryable: Queryable,
  learnerId: string,
  options?: { status?: string; limit?: number },
): Promise<FollowupRecord[]> {
  const clauses: string[] = ['learner_id = $1'];
  const params: unknown[] = [learnerId];
  let paramIdx = 2;

  if (options?.status) {
    clauses.push(`status = $${paramIdx++}`);
    params.push(options.status);
  }

  const limitClause = options?.limit ? `LIMIT ${Math.max(1, Number(options.limit))}` : '';

  const result = await queryable.query<FollowupRow>(
    `SELECT id, learner_id, concept_id, due_at, kind, status, payload, created_at
       FROM followups
      WHERE ${clauses.join(' AND ')}
      ORDER BY due_at ASC, created_at ASC
      ${limitClause}`,
    params,
  );
  return result.rows.map(mapFollowupRow);
}

export async function updateFollowupStatus(
  queryable: Queryable,
  followupId: string,
  learnerId: string,
  status: string,
  payload?: Record<string, unknown>,
): Promise<FollowupRecord | null> {
  let result;
  if (payload !== undefined) {
    result = await queryable.query<FollowupRow>(
      `UPDATE followups
          SET status = $3, payload = $4::jsonb
        WHERE id = $1 AND learner_id = $2
    RETURNING id, learner_id, concept_id, due_at, kind, status, payload, created_at`,
      [followupId, learnerId, status, JSON.stringify(payload)],
    );
  } else {
    result = await queryable.query<FollowupRow>(
      `UPDATE followups
          SET status = $3
        WHERE id = $1 AND learner_id = $2
    RETURNING id, learner_id, concept_id, due_at, kind, status, payload, created_at`,
      [followupId, learnerId, status],
    );
  }
  if (result.rows.length === 0) return null;
  return mapFollowupRow(result.rows[0]);
}

export async function getDueFollowups(
  queryable: Queryable,
  learnerId: string,
  asOf: Date | string = new Date(),
): Promise<FollowupRecord[]> {
  const asOfIso = new Date(asOf).toISOString();
  const result = await queryable.query<FollowupRow>(
    `SELECT id, learner_id, concept_id, due_at, kind, status, payload, created_at
       FROM followups
      WHERE learner_id = $1 AND status = 'pending' AND due_at <= $2
      ORDER BY due_at ASC`,
    [learnerId, asOfIso],
  );
  return result.rows.map(mapFollowupRow);
}

// ==========================================
// STUDY PLANS & PLAN ITEMS REPOSITORY
// ==========================================

interface StudyPlanRow extends Record<string, unknown> {
  id: string;
  learner_id: string;
  daily_minutes: number;
  exam_date: unknown;
  created_at: unknown;
  updated_at: unknown;
}

interface PlanItemRow extends Record<string, unknown> {
  id: string;
  plan_id: string;
  learner_id: string;
  concept_id: string;
  scheduled_date: unknown;
  minutes: number;
  type: string;
  status: string;
  reason: string;
  order_index: number;
  created_at: unknown;
  updated_at: unknown;
}

function mapStudyPlanRow(row: StudyPlanRow): StudyPlanRecord {
  return {
    id: row.id,
    learnerId: row.learner_id,
    dailyMinutes: Number(row.daily_minutes) || 60,
    examDate: toIsoString(row.exam_date),
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

function formatCalendarDate(val: unknown): string {
  if (!val) return '';
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(val).slice(0, 10);
}

function mapPlanItemRow(row: PlanItemRow): PlanItemRecord {
  const schedDateStr = formatCalendarDate(row.scheduled_date);

  return {
    id: row.id,
    planId: row.plan_id,
    learnerId: row.learner_id,
    conceptId: row.concept_id,
    scheduledDate: schedDateStr,
    minutes: Number(row.minutes) || 20,
    type: row.type as PlanItemType,
    status: row.status as PlanItemStatus,
    reason: row.reason,
    orderIndex: Number(row.order_index) || 0,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

export async function getStudyPlan(
  queryable: Queryable,
  learnerId: string,
): Promise<StudyPlanRecord | null> {
  const result = await queryable.query<StudyPlanRow>(
    `SELECT id, learner_id, daily_minutes, exam_date, created_at, updated_at
       FROM study_plans
      WHERE learner_id = $1`,
    [learnerId],
  );
  if (result.rows.length === 0) return null;
  return mapStudyPlanRow(result.rows[0]);
}

export async function getOrCreateStudyPlan(
  queryable: Queryable,
  learnerId: string,
  defaults?: { dailyMinutes?: number; examDate?: string | Date },
): Promise<StudyPlanRecord> {
  const existing = await getStudyPlan(queryable, learnerId);
  if (existing) return existing;

  await getOrCreateLearner(queryable, learnerId);

  const planId = `plan_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
  const dailyMinutes = defaults?.dailyMinutes ?? 60;
  const defaultExam = new Date(Date.now() + 28 * 24 * 3600 * 1000).toISOString();
  const examDate = defaults?.examDate ? new Date(defaults.examDate).toISOString() : defaultExam;

  const result = await queryable.query<StudyPlanRow>(
    `INSERT INTO study_plans (id, learner_id, daily_minutes, exam_date, created_at, updated_at)
     VALUES ($1, $2, $3, $4, now(), now())
     ON CONFLICT (id) DO UPDATE SET updated_at = now()
     RETURNING id, learner_id, daily_minutes, exam_date, created_at, updated_at`,
    [planId, learnerId, dailyMinutes, examDate],
  );
  return mapStudyPlanRow(result.rows[0]);
}

export async function listPlanItems(
  queryable: Queryable,
  learnerId: string,
  options?: {
    scheduledDate?: string;
    startDate?: string;
    endDate?: string;
    status?: PlanItemStatus;
    planId?: string;
  },
): Promise<PlanItemRecord[]> {
  const clauses: string[] = ['learner_id = $1'];
  const params: unknown[] = [learnerId];
  let paramIdx = 2;

  if (options?.planId) {
    clauses.push(`plan_id = $${paramIdx++}`);
    params.push(options.planId);
  }
  if (options?.scheduledDate) {
    clauses.push(`scheduled_date = $${paramIdx++}`);
    params.push(options.scheduledDate);
  }
  if (options?.startDate) {
    clauses.push(`scheduled_date >= $${paramIdx++}`);
    params.push(options.startDate);
  }
  if (options?.endDate) {
    clauses.push(`scheduled_date <= $${paramIdx++}`);
    params.push(options.endDate);
  }
  if (options?.status) {
    clauses.push(`status = $${paramIdx++}`);
    params.push(options.status);
  }

  const result = await queryable.query<PlanItemRow>(
    `SELECT id, plan_id, learner_id, concept_id, scheduled_date, minutes, type, status, reason, order_index, created_at, updated_at
       FROM plan_items
      WHERE ${clauses.join(' AND ')}
      ORDER BY scheduled_date ASC, order_index ASC`,
    params,
  );
  return result.rows.map(mapPlanItemRow);
}

export async function createPlanItems(
  queryable: Queryable,
  planId: string,
  learnerId: string,
  items: Array<{
    conceptId: string;
    scheduledDate: string; // YYYY-MM-DD
    minutes: number;
    type: PlanItemType;
    status?: PlanItemStatus;
    reason: string;
    orderIndex: number;
  }>,
): Promise<PlanItemRecord[]> {
  const created: PlanItemRecord[] = [];
  for (const item of items) {
    const id = `item_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
    const status = item.status ?? 'pending';
    const result = await queryable.query<PlanItemRow>(
      `INSERT INTO plan_items (id, plan_id, learner_id, concept_id, scheduled_date, minutes, type, status, reason, order_index, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now(), now())
       RETURNING id, plan_id, learner_id, concept_id, scheduled_date, minutes, type, status, reason, order_index, created_at, updated_at`,
      [
        id,
        planId,
        learnerId,
        item.conceptId,
        item.scheduledDate,
        item.minutes,
        item.type,
        status,
        item.reason,
        item.orderIndex,
      ],
    );
    if (result.rows.length > 0) {
      created.push(mapPlanItemRow(result.rows[0]));
    }
  }
  return created;
}

export async function clearPendingPlanItems(
  queryable: Queryable,
  learnerId: string,
  fromDate?: string,
): Promise<number> {
  const clauses: string[] = ["learner_id = $1 AND status = 'pending'"];
  const params: unknown[] = [learnerId];

  if (fromDate) {
    clauses.push(`scheduled_date >= $2`);
    params.push(fromDate);
  }

  const result = await queryable.query(
    `DELETE FROM plan_items WHERE ${clauses.join(' AND ')}`,
    params,
  );
  return result.rowCount ?? 0;
}

export async function updatePlanItemStatus(
  queryable: Queryable,
  itemId: string,
  learnerId: string,
  status: PlanItemStatus,
): Promise<PlanItemRecord | null> {
  const result = await queryable.query<PlanItemRow>(
    `UPDATE plan_items
        SET status = $3, updated_at = now()
      WHERE id = $1 AND learner_id = $2
  RETURNING id, plan_id, learner_id, concept_id, scheduled_date, minutes, type, status, reason, order_index, created_at, updated_at`,
    [itemId, learnerId, status],
  );
  if (result.rows.length === 0) return null;
  return mapPlanItemRow(result.rows[0]);
}

// ==========================================
// DECISION TRACES REPOSITORY
// ==========================================

interface DecisionTraceRow extends Record<string, unknown> {
  id: string;
  learner_id: string;
  turn_id: string;
  agent?: string;
  node: string;
  tool: string;
  input: unknown;
  output: unknown;
  input_summary?: string;
  output_summary?: string;
  reason: string;
  ms: number;
  latency_ms?: number;
  status?: string;
  fallback_used?: boolean;
  created_at: unknown;
}

function mapTraceRow(row: DecisionTraceRow): DecisionTraceEvent {
  return {
    id: row.id,
    learnerId: row.learner_id,
    turnId: row.turn_id,
    agent: typeof row.agent === 'string' ? row.agent : 'tutor',
    node: row.node,
    tool: row.tool,
    input: parseJson<Record<string, unknown>>(row.input, {}),
    output: parseJson<Record<string, unknown>>(row.output, {}),
    inputSummary: typeof row.input_summary === 'string' ? row.input_summary : undefined,
    outputSummary: typeof row.output_summary === 'string' ? row.output_summary : undefined,
    reason: row.reason,
    ms: Number(row.ms || row.latency_ms || 0),
    latencyMs: Number(row.latency_ms || row.ms || 0),
    status: typeof row.status === 'string' ? row.status : 'success',
    fallbackUsed: Boolean(row.fallback_used),
    createdAt: toIsoString(row.created_at),
  };
}

export async function recordDecisionTrace(
  queryable: Queryable,
  event: DecisionTraceEvent,
): Promise<DecisionTraceEvent> {
  await getOrCreateLearner(queryable, event.learnerId);

  const traceId = event.id ?? `trace_${randomUUID().replace(/-/g, '').slice(0, 14)}`;
  const latencyMs = Math.round(event.latencyMs ?? event.ms ?? 0);
  const status = event.status ?? 'success';
  const fallbackUsed = Boolean(event.fallbackUsed);
  const agent = event.agent ?? 'tutor';

  const result = await queryable.query<DecisionTraceRow>(
    `INSERT INTO decision_traces (id, learner_id, turn_id, agent, node, tool, input, output, input_summary, output_summary, reason, ms, latency_ms, status, fallback_used, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10, $11, $12, $13, $14, $15, now())
     RETURNING id, learner_id, turn_id, agent, node, tool, input, output, input_summary, output_summary, reason, ms, latency_ms, status, fallback_used, created_at`,
    [
      traceId,
      event.learnerId,
      event.turnId,
      agent,
      event.node,
      event.tool,
      JSON.stringify(event.input ?? {}),
      JSON.stringify(event.output ?? {}),
      event.inputSummary ?? null,
      event.outputSummary ?? null,
      event.reason,
      latencyMs,
      latencyMs,
      status,
      fallbackUsed,
    ],
  );
  return mapTraceRow(result.rows[0]);
}

export async function listDecisionTracesForTurn(
  queryable: Queryable,
  turnId: string,
): Promise<DecisionTraceEvent[]> {
  const result = await queryable.query<DecisionTraceRow>(
    `SELECT id, learner_id, turn_id, agent, node, tool, input, output, input_summary, output_summary, reason, ms, latency_ms, status, fallback_used, created_at
       FROM decision_traces
      WHERE turn_id = $1
      ORDER BY created_at ASC`,
    [turnId],
  );
  return result.rows.map(mapTraceRow);
}

