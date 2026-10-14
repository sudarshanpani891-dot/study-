import { randomUUID } from 'node:crypto';
import { NextRequest } from 'next/server';
import { PGlite } from '@electric-sql/pglite';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getServerPersistenceProvider } from '@/lib/persistence/server-provider';
import {
  decidePedagogicalPlan,
  type PlannerInput,
} from '@/lib/orchestration/tutor/planner';
import {
  detectLanguageTool,
  executeToolWithRetry,
  generateMicroLessonTool,
  generateOrGradeQuizTool,
  mapDoubtToConceptTool,
  scheduleFollowupTool,
} from '@/lib/orchestration/tutor/tools';
import {
  buildInitialTutorState,
  createTutorGraph,
  type TutorSSEEvent,
} from '@/lib/orchestration/tutor-graph';
import { ensureLearnerSchema } from '@/lib/server/learner/store';
import { listDecisionTracesForTurn } from '@/lib/server/learner/repository';

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

describe('Agentic Tutor Loop & Pedagogical Planner', () => {
  let db: PGlite;
  let pool: PGlitePool;

  beforeEach(async () => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.stubEnv('DATABASE_URL', `postgres://tutor-test-${randomUUID()}`);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    db = new PGlite();
    await db.waitReady;
    pool = new PGlitePool(db);

    await getServerPersistenceProvider(process.env.DATABASE_URL!, () => pool as never);
    await ensureLearnerSchema(pool as never);
  });

  afterEach(async () => {
    await pool.end();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe('Planner Decisions (Unit Tests)', () => {
    const concept = {
      id: 'sci-c5-cell-wall',
      nameOr: 'କୋଷ ପ୍ରାଚୀର (Cell Wall)',
      nameEn: 'Cell Wall and Cellulose',
    };
    const nextConcept = {
      id: 'sci-c5-nucleus',
      nameOr: 'ନ୍ୟୁକ୍ଲିଅସ୍ (Nucleus)',
      nameEn: 'Nucleus and Chromosomes',
    };

    it('decision: revisit_prerequisite when essential prerequisite score < 0.5 and mastery < 0.6', () => {
      const input: PlannerInput = {
        currentMasteryScore: 0.2,
        currentAttempts: 1,
        unmasteredPrerequisites: [
          {
            id: 'sci-c5-cell-membrane',
            nameOr: 'କୋଷ ଝିଲ୍ଲୀ (Plasma Membrane)',
            nameEn: 'Plasma Membrane and Diffusion',
            score: 0.3,
          },
        ],
        isDirectDoubt: false,
      };

      const plan = decidePedagogicalPlan(input, concept, nextConcept);
      expect(plan.decision).toBe('revisit_prerequisite');
      expect(plan.targetConceptId).toBe('sci-c5-cell-membrane');
      expect(plan.reason).toContain('Prerequisite "Plasma Membrane and Diffusion"');
      expect(plan.reasonOdia).toContain('ମୂଳଦୁଆ ମଜବୁତ');
    });

    it('decision: move_on when current mastery score >= 0.8 and no direct confusion', () => {
      const input: PlannerInput = {
        currentMasteryScore: 0.85,
        currentAttempts: 3,
        unmasteredPrerequisites: [],
        isDirectDoubt: false,
      };

      const plan = decidePedagogicalPlan(input, concept, nextConcept);
      expect(plan.decision).toBe('move_on');
      expect(plan.targetConceptId).toBe(nextConcept.id);
      expect(plan.reason).toContain('is mastered with score 0.85');
      expect(plan.reasonOdia).toContain('ପରବର୍ତ୍ତୀ ବିଷୟକୁ ଅଗ୍ରସର');
    });

    it('decision: quiz when concept is partially understood (score >= 0.5, attempts >= 1) or answers supplied', () => {
      const input1: PlannerInput = {
        currentMasteryScore: 0.6,
        currentAttempts: 1,
        unmasteredPrerequisites: [],
        isDirectDoubt: false,
      };

      const plan1 = decidePedagogicalPlan(input1, concept, nextConcept);
      expect(plan1.decision).toBe('quiz');
      expect(plan1.targetConceptId).toBe(concept.id);
      expect(plan1.reason).toContain('Assessing active recall');

      // Or when student submitted answers
      const input2: PlannerInput = {
        currentMasteryScore: 0.3,
        currentAttempts: 0,
        unmasteredPrerequisites: [],
        hasProvidedAnswers: true,
      };

      const plan2 = decidePedagogicalPlan(input2, concept, nextConcept);
      expect(plan2.decision).toBe('quiz');
    });

    it('decision: explain when score < 0.5 or direct doubt is asked with prerequisites cleared', () => {
      const input: PlannerInput = {
        currentMasteryScore: 0.1,
        currentAttempts: 0,
        unmasteredPrerequisites: [],
        isDirectDoubt: true,
      };

      const plan = decidePedagogicalPlan(input, concept, nextConcept);
      expect(plan.decision).toBe('explain');
      expect(plan.targetConceptId).toBe(concept.id);
      expect(plan.reason).toContain('micro-lesson');
      expect(plan.reasonOdia).toContain('ଗ୍ରାମୀଣ ଉଦାହରଣ');
    });
  });

  describe('Tool Failure, Retry-Once & Fallback', () => {
    it('succeeds on first attempt without fallback when operation is healthy', async () => {
      let callCount = 0;
      const tool = await executeToolWithRetry(
        'testTool',
        async () => {
          callCount++;
          return 'primary_success';
        },
        () => 'fallback_val',
      );

      expect(tool.result).toBe('primary_success');
      expect(tool.attempts).toBe(1);
      expect(tool.fallbackUsed).toBe(false);
      expect(callCount).toBe(1);
    });

    it('retries once and succeeds on second attempt when first attempt fails', async () => {
      let callCount = 0;
      const tool = await executeToolWithRetry(
        'testRetryTool',
        async () => {
          callCount++;
          if (callCount === 1) throw new Error('Temporary network glitch');
          return 'recovered_success';
        },
        () => 'fallback_val',
      );

      expect(tool.result).toBe('recovered_success');
      expect(tool.attempts).toBe(2);
      expect(tool.fallbackUsed).toBe(false);
      expect(callCount).toBe(2);
    });

    it('falls back to rule-based path and records failure after retry exhaustion', async () => {
      let callCount = 0;
      const tool = await executeToolWithRetry(
        'testFailingTool',
        async () => {
          callCount++;
          throw new Error('Persistent failure');
        },
        () => 'cached_rule_based_fallback',
      );

      expect(tool.result).toBe('cached_rule_based_fallback');
      expect(tool.attempts).toBe(2);
      expect(tool.fallbackUsed).toBe(true);
      expect(tool.error).toContain('Persistent failure');
      expect(callCount).toBe(2);
    });
  });

  describe('Tutor Tools Verification', () => {
    it('detectLanguageTool correctly detects Odia, bilingual and English inputs', async () => {
      const odia = await detectLanguageTool('କୋଷ ପ୍ରାଚୀର କଣ?', 'text');
      expect(odia.result.detectedLanguage).toContain('or-IN');

      const bilingual = await detectLanguageTool('Cell wall ଏବଂ କୋଷ ଝିଲ୍ଲୀ difference କଣ?', 'text');
      expect(bilingual.result.detectedLanguage).toContain('or-IN');

      const english = await detectLanguageTool('What is acceleration and velocity?', 'text');
      expect(english.result.detectedLanguage).toContain('en-IN');
    });

    it('generateMicroLessonTool strictly respects the <= 150 words constraint and includes analogy', async () => {
      const lesson = await generateMicroLessonTool(
        'sci-c5-cell-wall',
        'କୋଷ ପ୍ରାଚୀର',
        'Cell Wall',
      );

      expect(lesson.result.wordCount).toBeLessThanOrEqual(150);
      expect(lesson.result.lessonExample).toBeTruthy();
      expect(lesson.result.lessonTextOdia).toContain('କୋଷ ପ୍ରାଚୀର');
    });

    it('generateOrGradeQuizTool generates questions and grades student answer', async () => {
      // Generation
      const quizGen = await generateOrGradeQuizTool('sci-c5-cell-wall');
      expect(quizGen.result.questions.length).toBeGreaterThanOrEqual(2);

      // Grading
      const quizGraded = await generateOrGradeQuizTool('sci-c5-cell-wall', { q1: 'B', q2: 'C' });
      expect(quizGraded.result.gradedScore).toBe(1.0);
      expect(quizGraded.result.feedbackOdia).toContain('ଚମତ୍କାର');
    });
  });

  describe('Deterministic LangGraph 8-Node Workflow End-to-End', () => {
    it('executes all 8 nodes, records DB traces, updates mastery, and schedules followup', async () => {
      const learnerId = 'student_langgraph_test';
      const turnId = `turn_test_${Date.now()}`;

      const initialState = buildInitialTutorState({
        turnId,
        learnerId,
        query: 'ମୋତେ କୋଷ ପ୍ରାଚୀର (Cell Wall) ବିଷୟରେ ବୁଝାନ୍ତୁ',
        inputMode: 'text',
        queryable: pool as never,
      });

      const graph = createTutorGraph();
      const emittedEvents: TutorSSEEvent[] = [];

      const stream = await graph.stream(initialState, {
        streamMode: 'custom',
        writer: (chunk: unknown) => {
          emittedEvents.push(chunk as TutorSSEEvent);
        },
      } as any);

      for await (const chunk of stream) {
        emittedEvents.push(chunk as TutorSSEEvent);
      }

      // 1. Verify trace events generated for all 8 nodes
      const traceEvents = emittedEvents.filter((e) => e.type === 'trace');
      expect(traceEvents.length).toBeGreaterThanOrEqual(8);

      const nodesVisited = traceEvents.map((t) => (t.data as { node: string }).node);
      expect(nodesVisited).toContain('intake');
      expect(nodesVisited).toContain('understand');
      expect(nodesVisited).toContain('diagnose');
      expect(nodesVisited).toContain('plan');
      expect(nodesVisited).toContain('teach');
      expect(nodesVisited).toContain('check');
      expect(nodesVisited).toContain('update');
      expect(nodesVisited).toContain('followup_scheduler');

      // 2. Verify traces were persisted to PostgreSQL decision_traces table
      const dbTraces = await listDecisionTracesForTurn(pool as never, turnId);
      expect(dbTraces.length).toBeGreaterThanOrEqual(8);

      // Verify structure of DB trace
      const planTrace = dbTraces.find((t) => t.node === 'plan');
      expect(planTrace).toBeTruthy();
      expect(planTrace?.tool).toBe('pedagogicalPlanner');
      expect(planTrace?.reason).toBeTruthy();
      expect(planTrace?.ms).toBeGreaterThanOrEqual(0);

      // 3. Verify teaching and quiz chunks were emitted
      const teachingEvent = emittedEvents.find((e) => e.type === 'teaching');
      expect(teachingEvent).toBeTruthy();

      const quizEvent = emittedEvents.find((e) => e.type === 'quiz');
      expect(quizEvent).toBeTruthy();

      // 4. Verify followup chunk emitted
      const followupEvent = emittedEvents.find((e) => e.type === 'followup');
      expect(followupEvent).toBeTruthy();
    });
  });

  describe('API Route /api/tutor/turn', () => {
    it('serves real-time SSE stream with text/event-stream headers', async () => {
      const { POST } = await import('@/app/api/tutor/turn/route');

      const req = new NextRequest('http://localhost:3000/api/tutor/turn', {
        method: 'POST',
        headers: {
          'x-learner-id': 'student_api_route_test',
          'content-type': 'application/json',
          accept: 'text/event-stream',
        },
        body: JSON.stringify({
          text: 'ମାଇଟୋକଣ୍ଡ୍ରିଆ (Mitochondria) କାହିଁକି ଶକ୍ତି କେନ୍ଦ୍ର?',
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/event-stream');
      expect(res.headers.get('x-learner-id')).toBe('student_api_route_test');

      const bodyText = await res.text();
      expect(bodyText).toContain('data:');
      expect(bodyText).toContain('"node":"intake"');
      expect(bodyText).toContain('"node":"understand"');
      expect(bodyText).toContain('"node":"plan"');
      expect(bodyText).toContain('"type":"teaching"');
      expect(bodyText).toContain('"type":"quiz"');
      expect(bodyText).toContain('"type":"followup"');
    });

    it('answers non-streaming JSON when client requests application/json', async () => {
      const { POST } = await import('@/app/api/tutor/turn/route');

      const req = new NextRequest('http://localhost:3000/api/tutor/turn', {
        method: 'POST',
        headers: {
          'x-learner-id': 'student_json_mode_test',
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          text: 'ତ୍ୱରଣ (Acceleration) କଣ?',
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('application/json');

      const json = (await res.json()) as {
        turnId: string;
        learnerId: string;
        teaching: { textOdia: string; wordCount: number };
        quiz: { questions: unknown[] };
        traces: unknown[];
      };

      expect(json.learnerId).toBe('student_json_mode_test');
      expect(json.teaching.textOdia).toBeTruthy();
      expect(json.teaching.wordCount).toBeLessThanOrEqual(150);
      expect(json.quiz.questions.length).toBeGreaterThanOrEqual(2);
      expect(json.traces.length).toBeGreaterThanOrEqual(8);
    });
  });
});
