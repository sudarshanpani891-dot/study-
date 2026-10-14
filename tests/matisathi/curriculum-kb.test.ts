import { describe, it, expect } from 'vitest';
import { CLASS_9_CURRICULUM, DEFAULT_STUDENT_PROFILE } from '@/lib/matisathi/curriculum-kb';
import { searchCurriculumKB, recordDiagnosticFinding, updateMasteryMatrix, selectPedagogicalStrategy } from '@/lib/matisathi/tools';

describe('MatiSathi Curriculum Knowledge Base & Tools', () => {
  it('contains Class 9 Odisha SCERT curriculum capsules for Science & Geography', () => {
    expect(CLASS_9_CURRICULUM.length).toBeGreaterThanOrEqual(4);
    const cellCapsule = CLASS_9_CURRICULUM.find((c) => c.id === 'sci-cell-biology');
    expect(cellCapsule).toBeDefined();
    expect(cellCapsule?.topicNameOdia).toContain('କୋଷ ପ୍ରାଚୀର');
    expect(cellCapsule?.ruralAnalogy.metaphorTitleOdia).toContain('ଗାଁ ମାଟି ଘର');
    expect(cellCapsule?.keyTerms.some((t) => t.english === 'Cell Wall')).toBe(true);
  });

  it('searches curriculum deterministically with Odia and English queries', () => {
    const resCell = searchCurriculumKB('Cell Wall and Cell Membrane difference');
    expect(resCell.found).toBe(true);
    expect(resCell.matchedCapsule.id).toBe('sci-cell-biology');

    const resMahanadi = searchCurriculumKB('ମହାନଦୀ ଓ ହୀରାକୁଦ ବନ୍ଧ');
    expect(resMahanadi.found).toBe(true);
    expect(resMahanadi.matchedCapsule.id).toBe('geo-odisha-rivers');

    const resInertia = searchCurriculumKB('ନ୍ୟୁଟନଙ୍କ ପ୍ରଥମ ନିୟମ ଓ ଜଡ଼ତା');
    expect(resInertia.found).toBe(true);
    expect(resInertia.matchedCapsule.id).toBe('sci-force-motion');
  });

  it('diagnoses misconceptions accurately', () => {
    const cellCapsule = CLASS_9_CURRICULUM.find((c) => c.id === 'sci-cell-biology')!;
    const diagWithMisconception = recordDiagnosticFinding(cellCapsule, 'Do animal cell walls have cellulose?');
    expect(diagWithMisconception.hasMisconception).toBe(true);
    expect(diagWithMisconception.severity).toBe('medium');

    const diagClean = recordDiagnosticFinding(cellCapsule, 'What is the function of Mitochondria?');
    expect(diagClean.hasMisconception).toBe(false);
  });

  it('updates student mastery progression accurately', () => {
    const initial = {
      'sci-cell-biology': {
        conceptId: 'sci-cell-biology',
        subject: 'Science' as const,
        chapter: 'Chap 5',
        topicNameOdia: 'କୋଷ',
        topicNameEnglish: 'Cell',
        masteryScore: 40,
        totalDoubtsAsked: 1,
        lastStudiedAt: new Date().toISOString(),
        activeMisconceptions: [],
        status: 'needs_remedial' as const,
      },
    };

    const update = updateMasteryMatrix(initial, 'sci-cell-biology', false, false);
    expect(update.newScore).toBe(48); // 40 + 8
    expect(update.delta).toBe(8);
  });

  it('selects rural analogy pedagogical strategy when misconception exists', () => {
    const strategy = selectPedagogicalStrategy(true, 40, 50);
    expect(strategy).toBe('rural_analogy');
  });
});
