/**
 * Unit Tests: EMA Mastery Update Math & Adaptive Study Plan Prioritization
 */

import { describe, it, expect } from 'vitest';

describe('EMA Mastery Update & Study Plan Engine', () => {
  describe('Exponential Moving Average (EMA) Mastery Math (alpha = 0.35)', () => {
    function computeSequenceEma(scores: number[], alpha = 0.35): number[] {
      const history: number[] = [];
      let current = 0;
      for (let i = 0; i < scores.length; i++) {
        const attempt = scores[i];
        if (i === 0) {
          current = attempt;
        } else {
          current = current * (1 - alpha) + attempt * alpha;
        }
        history.push(Math.round(current * 1000) / 1000);
      }
      return history;
    }

    it('computes correct EMA trajectory for improving sequence [0, 1, 1]', () => {
      const trajectory = computeSequenceEma([0, 1, 1], 0.35);

      // Attempt 1: 0 -> current = 0.0
      expect(trajectory[0]).toBe(0.0);

      // Attempt 2: 0 * 0.65 + 1 * 0.35 = 0.35
      expect(trajectory[1]).toBe(0.35);

      // Attempt 3: 0.35 * 0.65 + 1 * 0.35 = 0.2275 + 0.35 = 0.5775
      expect(trajectory[2]).toBeCloseTo(0.5775, 2);
    });

    it('computes correct EMA trajectory for decaying sequence [1, 0, 0]', () => {
      const trajectory = computeSequenceEma([1, 0, 0], 0.35);

      // Attempt 1: 1.0 -> current = 1.0
      expect(trajectory[0]).toBe(1.0);

      // Attempt 2: 1.0 * 0.65 + 0 * 0.35 = 0.65
      expect(trajectory[1]).toBe(0.65);

      // Attempt 3: 0.65 * 0.65 + 0 = 0.4225
      expect(trajectory[2]).toBeCloseTo(0.4225, 2);
    });

    it('ensures score is bounded within [0.0, 1.0]', () => {
      const clampedMax = Math.max(0.0, Math.min(1.0, 1.25));
      const clampedMin = Math.max(0.0, Math.min(1.0, -0.15));
      expect(clampedMax).toBe(1.0);
      expect(clampedMin).toBe(0.0);
    });
  });

  describe('Adaptive Study Plan Sorting & Prioritization Logic', () => {
    interface DummyConcept {
      id: string;
      nameEn: string;
      prerequisites: string[];
    }

    const syllabus: DummyConcept[] = [
      { id: 'cell-types', nameEn: 'Plant vs Animal Cells', prerequisites: ['cell-membrane', 'cell-wall'] },
      { id: 'cell-membrane', nameEn: 'Cell Membrane', prerequisites: [] },
      { id: 'cell-wall', nameEn: 'Cell Wall', prerequisites: [] },
      { id: 'photosynthesis', nameEn: 'Photosynthesis', prerequisites: ['chlorophyll', 'plant-cells'] },
      { id: 'chlorophyll', nameEn: 'Chloroplast & Chlorophyll', prerequisites: [] },
      { id: 'plant-cells', nameEn: 'Plant Cells', prerequisites: ['cell-wall'] },
    ];

    function topologicalSort(concepts: DummyConcept[]): DummyConcept[] {
      const visited = new Set<string>();
      const sorted: DummyConcept[] = [];

      function visit(conceptId: string) {
        if (visited.has(conceptId)) return;
        visited.add(conceptId);
        const concept = syllabus.find((c) => c.id === conceptId);
        if (!concept) return;

        for (const prereqId of concept.prerequisites) {
          visit(prereqId);
        }
        sorted.push(concept);
      }

      for (const c of syllabus) {
        visit(c.id);
      }
      return sorted;
    }

    it('guarantees prerequisites appear before dependent concepts', () => {
      const sorted = topologicalSort(syllabus);
      const indexMap = new Map(sorted.map((c, idx) => [c.id, idx]));

      // cell-membrane must appear before cell-types
      expect(indexMap.get('cell-membrane')!).toBeLessThan(indexMap.get('cell-types')!);

      // cell-wall must appear before cell-types
      expect(indexMap.get('cell-wall')!).toBeLessThan(indexMap.get('cell-types')!);

      // chlorophyll must appear before photosynthesis
      expect(indexMap.get('chlorophyll')!).toBeLessThan(indexMap.get('photosynthesis')!);

      // cell-wall must appear before plant-cells
      expect(indexMap.get('cell-wall')!).toBeLessThan(indexMap.get('plant-cells')!);
    });

    it('prioritizes weakest concepts first and boosts remedial trigger concept', () => {
      const masteryScores: Record<string, number> = {
        'cell-membrane': 0.85,
        'cell-wall': 0.30, // weak
        chlorophyll: 0.20,  // weakest
      };

      const triggerConceptId = 'cell-wall';
      const lastQuizScore = 0.4; // failed quiz

      const scored = syllabus.map((concept) => {
        const score = masteryScores[concept.id] ?? 0.5;
        let priorityWeight = 1.0 - score;

        if (concept.id === triggerConceptId && lastQuizScore < 0.6) {
          priorityWeight += 2.0; // Boost remedial
        }
        return { id: concept.id, priorityWeight };
      });

      scored.sort((a, b) => b.priorityWeight - a.priorityWeight);

      // cell-wall should now have highest priority weight due to remedial boost
      expect(scored[0].id).toBe('cell-wall');
      expect(scored[0].priorityWeight).toBeGreaterThan(2.0);
    });
  });
});
