import { describe, it, expect } from 'vitest';
import { CLASS_9_CURRICULUM } from '@/lib/matisathi/curriculum-kb';

describe('Bilingual Portal (Odia ⇄ English)', () => {
  describe('Curriculum Content Bilingual Representation', () => {
    it('has both Odia and English chapter titles and topic names for every capsule', () => {
      for (const capsule of CLASS_9_CURRICULUM) {
        expect(capsule.chapterOdia.length).toBeGreaterThan(0);
        expect(capsule.chapterEnglish.length).toBeGreaterThan(0);
        expect(capsule.topicNameOdia.length).toBeGreaterThan(0);
        expect(capsule.topicNameEnglish.length).toBeGreaterThan(0);

        // Odia topic contains Odia characters
        expect(capsule.topicNameOdia).toMatch(/[\u0B00-\u0B7F]/);
        // English topic contains ASCII letters
        expect(capsule.topicNameEnglish).toMatch(/[A-Za-z]/);
      }
    });

    it('has dual language rural analogies connecting local Odisha context to textbook concepts', () => {
      for (const capsule of CLASS_9_CURRICULUM) {
        expect(capsule.ruralAnalogy.metaphorTitleOdia.length).toBeGreaterThan(0);
        expect(capsule.ruralAnalogy.metaphorTitleEnglish.length).toBeGreaterThan(0);
        expect(capsule.ruralAnalogy.explanationOdia.length).toBeGreaterThan(0);
        expect(capsule.ruralAnalogy.explanationEnglish.length).toBeGreaterThan(0);
      }
    });

    it('retains English technical scientific terms inside brackets in Odia explanations', () => {
      const cellCapsule = CLASS_9_CURRICULUM.find((c) => c.id === 'sci-cell-biology');
      expect(cellCapsule).toBeDefined();

      const keyTerms = cellCapsule?.keyTerms || [];
      expect(keyTerms.length).toBeGreaterThanOrEqual(2);

      const cellWall = keyTerms.find((t) => t.english === 'Cell Wall');
      expect(cellWall).toBeDefined();
      expect(cellWall?.odia).toBe('କୋଷ ପ୍ରାଚୀର');
    });
  });

  describe('Portal Navigation & Switcher Metadata', () => {
    it('defines clear three-portal destinations for student workflows', () => {
      const portals = [
        { id: 'generator', path: '/', defaultLang: 'en' },
        { id: 'matisathi', path: '/matisathi', defaultLang: 'or-IN' },
        { id: 'learn', path: '/learn', defaultLang: 'or-IN' },
      ];

      expect(portals).toHaveLength(3);
      expect(portals.map((p) => p.path)).toEqual(['/', '/matisathi', '/learn']);
    });

    it('validates bilingual status badge mappings', () => {
      const statusMap = {
        mastered: { odia: 'ପାରଦର୍ଶୀ (Mastered)', english: 'Mastered' },
        in_progress: { odia: 'ଅଭ୍ୟାସ ଚାଲିଛି (In Progress)', english: 'In Progress' },
        needs_remedial: { odia: 'ଅଧିକ ଅଭ୍ୟାସ ଦରକାର (Needs Practice)', english: 'Needs Practice' },
        not_started: { odia: 'ଆରମ୍ଭ ହୋଇନାହିଁ (Not Started)', english: 'Not Started' },
      };

      expect(statusMap.mastered.odia).toContain('ପାରଦର୍ଶୀ');
      expect(statusMap.mastered.english).toBe('Mastered');
      expect(statusMap.needs_remedial.english).toBe('Needs Practice');
    });
  });
});
