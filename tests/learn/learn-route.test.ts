import { describe, it, expect } from 'vitest';
import {
  getAgentTodaysLesson,
  getFriendlyAgentFollowup,
  BITE_SIZED_LESSONS,
} from '@/lib/learn/agent-curriculum';
import type { LocalMasteryRecord } from '@/lib/offline/dexie-db';

describe('/learn Route: Mobile-First Agentic EdTech Core', () => {
  describe('Agent Curriculum Selection (Today\'s Lesson)', () => {
    it('selects unmastered prerequisite concept for a new student', () => {
      // New student with 0 mastery records starts with prerequisite
      const lesson = getAgentTodaysLesson([]);
      expect(lesson).toBeDefined();
      expect(lesson.id).toBe('sci-c5-cell-membrane');
      expect(lesson.topicOdia).toBe('କୋଷ ଝିଲ୍ଲୀ ଓ ବିସରଣ');
      expect(lesson.topicEnglish).toBe('Cell Membrane & Diffusion');
      expect(lesson.analogyTitleOdia).toContain('ଜାଲି କବାଟ');
    });

    it('advances to next unmastered concept when cell membrane is mastered', () => {
      const records: LocalMasteryRecord[] = [
        {
          id: 'sunita:sci-c5-cell-membrane',
          learnerId: 'sunita',
          conceptId: 'sci-c5-cell-membrane',
          score: 0.95, // Mastered
          attempts: 2,
          lastSeen: new Date().toISOString(),
          nextReviewAt: null,
          updatedAt: new Date().toISOString(),
        },
      ];

      const lesson = getAgentTodaysLesson(records);
      expect(lesson).toBeDefined();
      // Should advance to cell wall
      expect(lesson.id).toBe('sci-c5-cell-wall');
      expect(lesson.topicOdia).toBe('କୋଷ ପ୍ରାଚୀର');
      expect(lesson.analogyTitleOdia).toContain('ମାଟି ଘରର ବାହାର ସୁରକ୍ଷା କାନ୍ଥ');
    });

    it('has bite-sized Odia explanations with village analogies and 2-question quizzes for all lessons', () => {
      for (const [id, lesson] of Object.entries(BITE_SIZED_LESSONS)) {
        expect(lesson.id).toBe(id);
        expect(lesson.topicOdia.length).toBeGreaterThan(0);
        expect(lesson.summaryOdia.length).toBeGreaterThan(0);
        // Words constraint: under 150 words
        const words = lesson.summaryOdia.split(/\s+/).filter(Boolean);
        expect(words.length).toBeLessThanOrEqual(150);

        // Rural analogy verification
        expect(lesson.analogyTitleOdia.length).toBeGreaterThan(0);
        expect(lesson.analogyOdia.length).toBeGreaterThan(0);

        // Exactly 2-question quiz check
        expect(lesson.quiz.length).toBe(2);
        for (const q of lesson.quiz) {
          expect(q.questionOdia.length).toBeGreaterThan(0);
          expect(q.options.length).toBeGreaterThanOrEqual(2);
          expect(q.correctIndex).toBeGreaterThanOrEqual(0);
          expect(q.hintOdia.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('Friendly Agent Follow-up Card (No Jargon)', () => {
    it('generates a warm, conversational Odia follow-up greeting without technical jargon', () => {
      const followup = getFriendlyAgentFollowup('ସୁନୀତା');
      expect(followup).toBeDefined();
      expect(followup.greetingOdia).toBe('ନମସ୍କାର ସୁନୀତା!');
      expect(followup.questionOdia).toContain('ଗତକାଲି');
      expect(followup.options.length).toBe(2);
      expect(followup.correctIndex).toBe(0);

      // Verify ZERO technical jargon
      const fullText = `${followup.questionOdia} ${followup.explanationOdia}`;
      expect(fullText).not.toMatch(/LangGraph|tokens|TPM|SSE|orchestration|vector|embedding|LLM/i);
    });
  });
});
