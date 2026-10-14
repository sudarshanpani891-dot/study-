/**
 * Unit Tests: Multi-Agent Supervisor Routing, Language Guard & Followup Scheduling
 */

import { describe, it, expect } from 'vitest';
import { validateTextCompliance } from '@/lib/orchestration/tutor/agents/language-guard-agent';
import {
  calculateSpacedFollowupIntervalDays,
  formatProactiveHook,
} from '@/lib/orchestration/tutor/agents/followup-agent';

describe('Supervisor & Agent Unit Tests', () => {
  describe('Language Guard Validation (Step 7)', () => {
    it('rejects text exceeding 150 words limit', () => {
      const longText = new Array(160).fill('ଶବ୍ଦ').join(' ');
      const result = validateTextCompliance(longText, 'or-IN');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Word count exceeds 150 limit');
    });

    it('rejects pure English text when learner language is Odia', () => {
      const englishText =
        'The cell wall is an outer protective layer surrounding plant cells that gives structure and strength.';
      const result = validateTextCompliance(englishText, 'or-IN');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Insufficient Odia script');
    });

    it('approves compliant Odia text with single bracketed English technical terms', () => {
      const validLesson =
        'କୋଷ ପ୍ରାଚୀର (Cell Wall) କେବଳ ଉଦ୍ଭିଦ କୋଷରେ ଥାଏ | ଏହା ସେଲ୍ୟୁଲୋଜ୍ (Cellulose) ରେ ନିର୍ମିତ ଏକ ଶକ୍ତ ଆବରଣ ଅଟେ | ଏହା ଗଛକୁ ଝଡ଼-ବର୍ଷାରୁ ରକ୍ଷା କରେ | ଗାଁ ମାଟି ଘରର ବାହାର କାନ୍ଥ ପରି ଏହା କାମ କରେ |';
      const result = validateTextCompliance(validLesson, 'or-IN');
      expect(result.valid).toBe(true);
      expect(result.wordCount).toBeLessThan(150);
    });

    it('approves compliant Hindi text under 150 words', () => {
      const validHindi =
        'कोशिका भित्ति (Cell Wall) केवल पादप कोशिकाओं में पाई जाती है। यह सेल्यूलोज की बनी एक कठोर परत है जो पौधे को सुरक्षा प्रदान करती है।';
      const result = validateTextCompliance(validHindi, 'hi');
      expect(result.valid).toBe(true);
      expect(result.wordCount).toBeLessThan(150);
    });
  });

  describe('Spaced Repetition Followup Scheduler (Step 6)', () => {
    it('schedules 1-day check_in interval for low mastery score (< 0.6)', () => {
      const schedule = calculateSpacedFollowupIntervalDays(0.45);
      expect(schedule.days).toBe(1);
      expect(schedule.kind).toBe('check_in');
    });

    it('schedules 3-day spru interval for intermediate score (0.6 - 0.79)', () => {
      const schedule = calculateSpacedFollowupIntervalDays(0.72);
      expect(schedule.days).toBe(3);
      expect(schedule.kind).toBe('spru');
    });

    it('schedules 7-day spru interval for strong score (0.8 - 0.89)', () => {
      const schedule = calculateSpacedFollowupIntervalDays(0.85);
      expect(schedule.days).toBe(7);
      expect(schedule.kind).toBe('spru');
    });

    it('schedules 14-day exam_prep interval for mastered score (>= 0.9)', () => {
      const schedule = calculateSpacedFollowupIntervalDays(0.95);
      expect(schedule.days).toBe(14);
      expect(schedule.kind).toBe('exam_prep');
    });

    it('formats empathetic Odia hook with student name', () => {
      const hook = formatProactiveHook('Laxmi', 'ଆଲୋକ ସ୍ଲେଷଣ', 'Photosynthesis', 'or-IN', 'check_in');
      expect(hook).toContain('Laxmi');
      expect(hook).toContain('ଆଲୋକ ସ୍ଲେଷଣ');
      expect(hook).toContain('ଗୋଟିଏ ପ୍ରଶ୍ନ');
    });

    it('formats natural Hindi hook when student language is Hindi', () => {
      const hook = formatProactiveHook('Laxmi', 'प्रकाश संश्लेषण', 'Photosynthesis', 'hi', 'check_in');
      expect(hook).toContain('Laxmi');
      expect(hook).toContain('प्रकाश संश्लेषण');
      expect(hook).toContain('सवाल');
    });
  });
});
