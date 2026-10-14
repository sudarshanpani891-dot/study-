import { randomUUID } from 'node:crypto';
import { NextRequest } from 'next/server';
import { PGlite } from '@electric-sql/pglite';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getServerPersistenceProvider } from '@/lib/persistence/server-provider';
import { resolveLearnerId, withLearner } from '@/lib/server/learner/identity';
import {
  createDoubt,
  createFollowup,
  getConcept,
  getLearner,
  getMastery,
  getOrCreateLearner,
  listConcepts,
  listDoubts,
  listFollowups,
  listLearnerMastery,
  recordMasteryAttempt,
  resolveDoubt,
  updateFollowupStatus,
  updateLearner,
} from '@/lib/server/learner/repository';
import { CLASS_9_ODISHA_SCIENCE_CONCEPTS } from '@/lib/server/learner/seeds/odisha-class9-science';
import { ensureLearnerSchema } from '@/lib/server/learner/store';

class PGlitePool {
  constructor(readonly db: PGlite) {}
  query(text: string, params?: unknown[]) {
    return this.db.query(text, params);
  }
  async connect() {
    return {
      query: (text: string, params?: unknown[]) => this.db.query(text, params),
      release() {},
    };
  }
  async end() {
    await this.db.close();
  }
}

describe('Learner Model & PostgreSQL Persistence', () => {
  let db: PGlite;
  let pool: PGlitePool;

  beforeEach(async () => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.stubEnv('DATABASE_URL', `postgres://learner-test-${randomUUID()}`);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    db = new PGlite();
    await db.waitReady;
    pool = new PGlitePool(db);

    // Bootstrap provider with in-memory PGlite pool
    await getServerPersistenceProvider(process.env.DATABASE_URL!, () => pool as never);
  });

  afterEach(async () => {
    await pool.end();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe('Schema Migrations and Concept Seeding', () => {
    it('creates all 5 tables and seeds at least 15 Class 9 Odisha Science concepts', async () => {
      // Ensure schema runs
      await ensureLearnerSchema(pool as never);

      // Verify concepts seeded
      const concepts = await listConcepts(pool as never);
      expect(concepts.length).toBeGreaterThanOrEqual(15);
      expect(concepts.length).toBe(CLASS_9_ODISHA_SCIENCE_CONCEPTS.length);

      // Verify two distinct chapters
      const chapters = new Set(concepts.map((c) => c.chapter));
      expect(chapters.size).toBeGreaterThanOrEqual(2);
      expect(chapters).toContain('Chapter 5: The Fundamental Unit of Life (Cell)');
      expect(chapters).toContain('Chapter 8: Motion');

      // Verify Odia and English names exist
      for (const concept of concepts) {
        expect(concept.nameOr).toBeTruthy();
        expect(concept.nameEn).toBeTruthy();
        expect(concept.subject).toBe('Science');
      }

      // Verify prerequisites
      const cellWall = await getConcept(pool as never, 'sci-c5-cell-wall');
      expect(cellWall?.prerequisites).toContain('sci-c5-cell-membrane');

      const acceleration = await getConcept(pool as never, 'sci-c8-acceleration');
      expect(acceleration?.prerequisites).toContain('sci-c8-speed-velocity');
    });

    it('concept seeding is idempotent', async () => {
      await ensureLearnerSchema(pool as never);
      await ensureLearnerSchema(pool as never);

      const concepts = await listConcepts(pool as never);
      expect(concepts.length).toBe(CLASS_9_ODISHA_SCIENCE_CONCEPTS.length);
    });
  });

  describe('Learner Profile Management', () => {
    it('creates an anonymous learner if none exists and updates details', async () => {
      await ensureLearnerSchema(pool as never);

      const learnerId = 'anon_dev_12345';
      const learner = await getOrCreateLearner(pool as never, learnerId, {
        language: 'or-IN',
        grade: 'Class 9',
        deviceProfile: { lowDataMode: true, deviceModel: 'JioPhone Next' },
      });

      expect(learner.id).toBe(learnerId);
      expect(learner.language).toBe('or-IN');
      expect(learner.grade).toBe('Class 9');
      expect(learner.deviceProfile.lowDataMode).toBe(true);

      // Update learner
      const updated = await updateLearner(pool as never, learnerId, {
        name: 'Sasmita Sahoo',
        deviceProfile: { lowDataMode: true, batteryOptimized: true },
      });

      expect(updated.name).toBe('Sasmita Sahoo');
      expect(updated.deviceProfile.batteryOptimized).toBe(true);

      // Retrieve learner
      const fetched = await getLearner(pool as never, learnerId);
      expect(fetched?.name).toBe('Sasmita Sahoo');
    });
  });

  describe('Mastery Tracking', () => {
    it('records attempts and updates score (clamped between 0 and 1)', async () => {
      await ensureLearnerSchema(pool as never);

      const learnerId = 'anon_learner_mastery';
      const conceptId = 'sci-c5-cell-basics';

      // First attempt
      const attempt1 = await recordMasteryAttempt(pool as never, {
        learnerId,
        conceptId,
        score: 0.65,
        nextReviewAt: '2026-10-15T08:00:00Z',
      });

      expect(attempt1.learnerId).toBe(learnerId);
      expect(attempt1.conceptId).toBe(conceptId);
      expect(attempt1.score).toBeCloseTo(0.65);
      expect(attempt1.attempts).toBe(1);
      expect(attempt1.nextReviewAt).toBe('2026-10-15T08:00:00.000Z');

      // Second attempt with clamped score (> 1 -> 1.0)
      const attempt2 = await recordMasteryAttempt(pool as never, {
        learnerId,
        conceptId,
        score: 1.5,
      });

      expect(attempt2.attempts).toBe(2);
      expect(attempt2.score).toBe(1.0);

      // Verify listLearnerMastery
      const allMastery = await listLearnerMastery(pool as never, learnerId);
      expect(allMastery.length).toBe(1);
      expect(allMastery[0].conceptId).toBe(conceptId);

      // Verify getMastery
      const single = await getMastery(pool as never, learnerId, conceptId);
      expect(single?.attempts).toBe(2);
    });
  });

  describe('Doubts Recording and Resolution', () => {
    it('records doubts, lists them, and marks them resolved', async () => {
      await ensureLearnerSchema(pool as never);

      const learnerId = 'anon_learner_doubts';
      const doubt = await createDoubt(pool as never, {
        learnerId,
        text: 'କୋଷ ପ୍ରାଚୀର ଏବଂ କୋଷ ଝିଲ୍ଲୀ ମଧ୍ୟରେ ପାର୍ଥକ୍ୟ କଣ?',
        language: 'or-IN',
        detectedConceptId: 'sci-c5-cell-wall',
      });

      expect(doubt.id).toMatch(/^doubt_/);
      expect(doubt.learnerId).toBe(learnerId);
      expect(doubt.resolved).toBe(false);
      expect(doubt.detectedConceptId).toBe('sci-c5-cell-wall');

      // List unresolved doubts
      const unresolved = await listDoubts(pool as never, learnerId, { resolved: false });
      expect(unresolved.length).toBe(1);

      // Resolve doubt
      const resolved = await resolveDoubt(pool as never, doubt.id, learnerId, true);
      expect(resolved?.resolved).toBe(true);

      // List resolved doubts
      const resolvedList = await listDoubts(pool as never, learnerId, { resolved: true });
      expect(resolvedList.length).toBe(1);
    });
  });

  describe('Followups and Spaced Repetition', () => {
    it('creates followup reminders and updates status', async () => {
      await ensureLearnerSchema(pool as never);

      const learnerId = 'anon_learner_followups';
      const conceptId = 'sci-c8-acceleration';
      const dueAt = new Date(Date.now() + 86400000).toISOString();

      const fup = await createFollowup(pool as never, {
        learnerId,
        conceptId,
        dueAt,
        status: 'pending',
        payload: { reminderType: 'quick_quiz', questionCount: 3 },
      });

      expect(fup.id).toMatch(/^fup_/);
      expect(fup.status).toBe('pending');
      expect(fup.payload.reminderType).toBe('quick_quiz');

      // List pending followups
      const pending = await listFollowups(pool as never, learnerId, { status: 'pending' });
      expect(pending.length).toBe(1);
      expect(pending[0].id).toBe(fup.id);

      // Complete followup
      const completed = await updateFollowupStatus(pool as never, fup.id, learnerId, 'completed', {
        completedScore: 0.9,
      });
      expect(completed?.status).toBe('completed');
      expect(completed?.payload.completedScore).toBe(0.9);
    });
  });

  describe('Anonymous Device Identity Resolution', () => {
    it('resolves learner ID from x-learner-id header', () => {
      const req = new NextRequest('http://localhost:3000/api/learner/profile', {
        headers: { 'x-learner-id': 'dev_header_999' },
      });
      const outcome = resolveLearnerId(req);
      expect(outcome.learnerId).toBe('dev_header_999');
      expect(outcome.isNew).toBe(false);
    });

    it('resolves learner ID from cookie', () => {
      const req = new NextRequest('http://localhost:3000/api/learner/profile', {
        headers: { cookie: 'learner_id=cookie_user_888' },
      });
      const outcome = resolveLearnerId(req);
      expect(outcome.learnerId).toBe('cookie_user_888');
      expect(outcome.isNew).toBe(false);
    });

    it('resolves learner ID from query parameter', () => {
      const req = new NextRequest('http://localhost:3000/api/learner/profile?learner_id=query_user_777');
      const outcome = resolveLearnerId(req);
      expect(outcome.learnerId).toBe('query_user_777');
      expect(outcome.isNew).toBe(false);
    });

    it('mints new anonymous ID and attaches Set-Cookie header', async () => {
      const req = new NextRequest('http://localhost:3000/api/learner/profile');
      const res = await withLearner(req, async ({ learnerId }, headers) => {
        expect(learnerId).toMatch(/^anon_/);
        return new Response(JSON.stringify({ ok: true }), { headers });
      });

      expect(res.headers.get('set-cookie')).toContain('learner_id=anon_');
      expect(res.headers.get('x-learner-id')).toMatch(/^anon_/);
    });
  });

  describe('API Route Handlers (/api/learner/*)', () => {
    it('GET & PUT /api/learner/profile', async () => {
      await ensureLearnerSchema(pool as never);
      const { GET, PUT } = await import('@/app/api/learner/profile/route');

      // GET default profile
      const getReq = new NextRequest('http://localhost:3000/api/learner/profile', {
        headers: { 'x-learner-id': 'test_student_profile' },
      });
      const getRes = await GET(getReq);
      expect(getRes.status).toBe(200);
      const getData = (await getRes.json()) as { learner: { id: string; grade: string } };
      expect(getData.learner.id).toBe('test_student_profile');
      expect(getData.learner.grade).toBe('Class 9');

      // PUT update profile
      const putReq = new NextRequest('http://localhost:3000/api/learner/profile', {
        method: 'PUT',
        headers: {
          'x-learner-id': 'test_student_profile',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ name: 'Lopamudra', grade: 'Class 9 (Odisha)' }),
      });
      const putRes = await PUT(putReq);
      expect(putRes.status).toBe(200);
      const putData = (await putRes.json()) as { learner: { name: string; grade: string } };
      expect(putData.learner.name).toBe('Lopamudra');
      expect(putData.learner.grade).toBe('Class 9 (Odisha)');
    });

    it('GET /api/learner/concepts', async () => {
      await ensureLearnerSchema(pool as never);
      const { GET } = await import('@/app/api/learner/concepts/route');

      const req = new NextRequest('http://localhost:3000/api/learner/concepts?chapter=Chapter 8: Motion');
      const res = await GET(req);
      expect(res.status).toBe(200);
      const data = (await res.json()) as { concepts: Array<{ id: string; chapter: string }> };
      expect(data.concepts.length).toBeGreaterThanOrEqual(7);
      expect(data.concepts.every((c) => c.chapter === 'Chapter 8: Motion')).toBe(true);
    });

    it('POST & GET /api/learner/mastery', async () => {
      await ensureLearnerSchema(pool as never);
      const { GET, POST } = await import('@/app/api/learner/mastery/route');

      // POST attempt
      const postReq = new NextRequest('http://localhost:3000/api/learner/mastery', {
        method: 'POST',
        headers: {
          'x-learner-id': 'student_mastery_route',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          conceptId: 'sci-c5-cell-basics',
          score: 0.85,
        }),
      });
      const postRes = await POST(postReq);
      expect(postRes.status).toBe(200);
      const postData = (await postRes.json()) as { mastery: { score: number; attempts: number } };
      expect(postData.mastery.score).toBeCloseTo(0.85);
      expect(postData.mastery.attempts).toBe(1);

      // GET mastery
      const getReq = new NextRequest(
        'http://localhost:3000/api/learner/mastery?conceptId=sci-c5-cell-basics',
        { headers: { 'x-learner-id': 'student_mastery_route' } },
      );
      const getRes = await GET(getReq);
      expect(getRes.status).toBe(200);
      const getData = (await getRes.json()) as { mastery: { score: number } };
      expect(getData.mastery.score).toBeCloseTo(0.85);
    });

    it('POST, GET, & PATCH /api/learner/doubts', async () => {
      await ensureLearnerSchema(pool as never);
      const { GET, POST } = await import('@/app/api/learner/doubts/route');
      const { PATCH } = await import('@/app/api/learner/doubts/[id]/route');

      // POST doubt
      const postReq = new NextRequest('http://localhost:3000/api/learner/doubts', {
        method: 'POST',
        headers: {
          'x-learner-id': 'student_doubts_route',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          text: 'ମାଇଟୋକଣ୍ଡ୍ରିଆ କାହିଁକି ଶକ୍ତି କେନ୍ଦ୍ର?',
          detectedConceptId: 'sci-c5-mitochondria',
        }),
      });
      const postRes = await POST(postReq);
      expect(postRes.status).toBe(201);
      const postData = (await postRes.json()) as { doubt: { id: string; resolved: boolean } };
      expect(postData.doubt.resolved).toBe(false);

      // GET doubts
      const getReq = new NextRequest('http://localhost:3000/api/learner/doubts', {
        headers: { 'x-learner-id': 'student_doubts_route' },
      });
      const getRes = await GET(getReq);
      expect(getRes.status).toBe(200);
      const getData = (await getRes.json()) as { doubts: Array<{ id: string }> };
      expect(getData.doubts.length).toBe(1);

      // PATCH resolve doubt
      const patchReq = new NextRequest(`http://localhost:3000/api/learner/doubts/${postData.doubt.id}`, {
        method: 'PATCH',
        headers: {
          'x-learner-id': 'student_doubts_route',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ resolved: true }),
      });
      const patchRes = await PATCH(patchReq, { params: Promise.resolve({ id: postData.doubt.id }) });
      expect(patchRes.status).toBe(200);
      const patchData = (await patchRes.json()) as { doubt: { resolved: boolean } };
      expect(patchData.doubt.resolved).toBe(true);
    });

    it('POST, GET, & PATCH /api/learner/followups', async () => {
      await ensureLearnerSchema(pool as never);
      const { GET, POST } = await import('@/app/api/learner/followups/route');
      const { PATCH } = await import('@/app/api/learner/followups/[id]/route');

      // POST followup
      const postReq = new NextRequest('http://localhost:3000/api/learner/followups', {
        method: 'POST',
        headers: {
          'x-learner-id': 'student_fup_route',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          conceptId: 'sci-c8-motion-rest',
          dueAt: new Date().toISOString(),
          status: 'pending',
        }),
      });
      const postRes = await POST(postReq);
      expect(postRes.status).toBe(201);
      const postData = (await postRes.json()) as { followup: { id: string; status: string } };
      expect(postData.followup.status).toBe('pending');

      // GET followups
      const getReq = new NextRequest('http://localhost:3000/api/learner/followups', {
        headers: { 'x-learner-id': 'student_fup_route' },
      });
      const getRes = await GET(getReq);
      expect(getRes.status).toBe(200);
      const getData = (await getRes.json()) as { followups: Array<{ id: string }> };
      expect(getData.followups.length).toBe(1);

      // PATCH followup
      const patchReq = new NextRequest(
        `http://localhost:3000/api/learner/followups/${postData.followup.id}`,
        {
          method: 'PATCH',
          headers: {
            'x-learner-id': 'student_fup_route',
            'content-type': 'application/json',
          },
          body: JSON.stringify({ status: 'completed' }),
        },
      );
      const patchRes = await PATCH(patchReq, { params: Promise.resolve({ id: postData.followup.id }) });
      expect(patchRes.status).toBe(200);
      const patchData = (await patchRes.json()) as { followup: { status: string } };
      expect(patchData.followup.status).toBe('completed');
    });
  });
});
