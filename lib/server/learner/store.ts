/**
 * Learner Model Store & Database Schema
 * Uses PostgreSQL persistence layer via @openmaic/storage/pg-migrations.
 * No new ORM introduced.
 */

import type { Queryable } from '@openmaic/storage/document/pg';
import {
  applySchemaMigrations,
  type MigrationQueryable,
  type SchemaMigrationSet,
} from '@openmaic/storage/pg-migrations';

import { CLASS_9_ODISHA_SCIENCE_CONCEPTS } from './seeds/odisha-class9-science';

export const LEARNER_SCHEMA = `
CREATE TABLE IF NOT EXISTS learners (
  id TEXT PRIMARY KEY,
  name TEXT,
  language TEXT NOT NULL DEFAULT 'or-IN',
  grade TEXT NOT NULL DEFAULT 'Class 9',
  device_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS concepts (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  chapter TEXT NOT NULL,
  name_or TEXT NOT NULL,
  name_en TEXT NOT NULL,
  prerequisites JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mastery (
  learner_id TEXT NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  concept_id TEXT NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  score REAL NOT NULL DEFAULT 0.0 CHECK (score >= 0.0 AND score <= 1.0),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  next_review_at TIMESTAMPTZ,
  PRIMARY KEY (learner_id, concept_id)
);

CREATE TABLE IF NOT EXISTS doubts (
  id TEXT PRIMARY KEY,
  learner_id TEXT NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'or-IN',
  detected_concept_id TEXT REFERENCES concepts(id) ON DELETE SET NULL,
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS followups (
  id TEXT PRIMARY KEY,
  learner_id TEXT NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  concept_id TEXT NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  due_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mastery_learner_id ON mastery (learner_id);
CREATE INDEX IF NOT EXISTS idx_doubts_learner_id ON doubts (learner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_followups_learner_due ON followups (learner_id, due_at ASC);
CREATE INDEX IF NOT EXISTS idx_concepts_subject_chapter ON concepts (subject, chapter);
`;

export async function seedClass9ScienceConcepts(queryable: MigrationQueryable): Promise<void> {
  for (const c of CLASS_9_ODISHA_SCIENCE_CONCEPTS) {
    await queryable.query(
      `INSERT INTO concepts (id, subject, chapter, name_or, name_en, prerequisites)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)
       ON CONFLICT (id) DO UPDATE SET
         subject = EXCLUDED.subject,
         chapter = EXCLUDED.chapter,
         name_or = EXCLUDED.name_or,
         name_en = EXCLUDED.name_en,
         prerequisites = EXCLUDED.prerequisites`,
      [c.id, c.subject, c.chapter, c.nameOr, c.nameEn, JSON.stringify(c.prerequisites)],
    );
  }
}

export const DECISION_TRACES_SCHEMA = `
CREATE TABLE IF NOT EXISTS decision_traces (
  id TEXT PRIMARY KEY,
  learner_id TEXT NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  turn_id TEXT NOT NULL,
  node TEXT NOT NULL,
  tool TEXT NOT NULL,
  input JSONB NOT NULL DEFAULT '{}'::jsonb,
  output JSONB NOT NULL DEFAULT '{}'::jsonb,
  reason TEXT NOT NULL,
  ms INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_decision_traces_turn ON decision_traces (turn_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_decision_traces_learner ON decision_traces (learner_id, created_at DESC);
`;

export const MULTI_AGENT_STUDY_PLAN_SCHEMA = `
-- 1. Enhance learners with board, daily_minutes, and exam_date
ALTER TABLE learners
  ADD COLUMN IF NOT EXISTS board TEXT NOT NULL DEFAULT 'BSE Odisha',
  ADD COLUMN IF NOT EXISTS daily_minutes INTEGER NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS exam_date TIMESTAMPTZ;

-- 2. Enhance followups with kind
ALTER TABLE followups
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'recheck';

-- 3. Enhance decision_traces with multi-agent metadata
ALTER TABLE decision_traces
  ADD COLUMN IF NOT EXISTS agent TEXT NOT NULL DEFAULT 'tutor',
  ADD COLUMN IF NOT EXISTS input_summary TEXT,
  ADD COLUMN IF NOT EXISTS output_summary TEXT,
  ADD COLUMN IF NOT EXISTS latency_ms INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'success',
  ADD COLUMN IF NOT EXISTS fallback_used BOOLEAN NOT NULL DEFAULT false;

-- 4. Adaptive Study Plans
CREATE TABLE IF NOT EXISTS study_plans (
  id TEXT PRIMARY KEY,
  learner_id TEXT NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  daily_minutes INTEGER NOT NULL DEFAULT 60,
  exam_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Individual Adaptive Study Plan Items
CREATE TABLE IF NOT EXISTS plan_items (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL REFERENCES study_plans(id) ON DELETE CASCADE,
  learner_id TEXT NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  concept_id TEXT NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  minutes INTEGER NOT NULL DEFAULT 20,
  type TEXT NOT NULL CHECK (type IN ('learn', 'practice', 'revise')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped')),
  reason TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_study_plans_learner ON study_plans (learner_id);
CREATE INDEX IF NOT EXISTS idx_plan_items_learner_date ON plan_items (learner_id, scheduled_date ASC);
CREATE INDEX IF NOT EXISTS idx_plan_items_plan ON plan_items (plan_id, order_index ASC);
`;

export const LEARNER_MIGRATIONS: SchemaMigrationSet = {
  store: 'learner-model',
  migrations: [
    { version: 1, name: 'baseline', up: LEARNER_SCHEMA, transaction: false },
    { version: 2, name: 'seed_class9_science', up: seedClass9ScienceConcepts },
    { version: 3, name: 'decision_traces', up: DECISION_TRACES_SCHEMA, transaction: false },
    { version: 4, name: 'study_plans_and_multiagent', up: MULTI_AGENT_STUDY_PLAN_SCHEMA, transaction: false },
  ],
};

export async function ensureLearnerSchema(queryable: Queryable): Promise<void> {
  await applySchemaMigrations(queryable, LEARNER_MIGRATIONS);
}

