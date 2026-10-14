/**
 * Tools for the Agentic Tutor Loop
 * All tool calls implement:
 * 1. Primary execution
 * 2. Retry once on failure
 * 3. Fallback to cached/rule-based path if retry fails
 * 4. Structured trace outcome recording { node, tool, input, output, reason, ms, fallbackUsed }
 */

import type { Queryable } from '@openmaic/storage/document/pg';

import type { ConceptRecord, FollowupRecord, MasteryRecord } from '@/lib/server/learner/types';
import {
  createFollowup,
  getConcept,
  getDueFollowups,
  getMastery,
  listConcepts,
  recordMasteryAttempt,
} from '@/lib/server/learner/repository';
import { CLASS_9_CURRICULUM } from '@/lib/matisathi/curriculum-kb';

export interface ToolExecution<T> {
  result: T;
  ms: number;
  attempts: number;
  fallbackUsed: boolean;
  error?: string;
}

/**
 * Reusable retry-once + fallback harness
 */
export async function executeToolWithRetry<T>(
  toolName: string,
  primaryFn: () => Promise<T>,
  fallbackFn: () => Promise<T> | T,
): Promise<ToolExecution<T>> {
  const t0 = Date.now();
  try {
    const result = await primaryFn();
    return {
      result,
      ms: Date.now() - t0,
      attempts: 1,
      fallbackUsed: false,
    };
  } catch (err1) {
    // Retry once
    try {
      const result = await primaryFn();
      return {
        result,
        ms: Date.now() - t0,
        attempts: 2,
        fallbackUsed: false,
      };
    } catch (err2) {
      // Fallback
      const result = await fallbackFn();
      return {
        result,
        ms: Date.now() - t0,
        attempts: 2,
        fallbackUsed: true,
        error: err2 instanceof Error ? err2.message : String(err2),
      };
    }
  }
}

// ==========================================
// TOOL 1: INTAKE & LANGUAGE DETECTION
// ==========================================

export interface IntakeResult {
  text: string;
  detectedLanguage: string;
  isVoice: boolean;
}

export async function detectLanguageTool(
  rawInput: string,
  inputMode: 'voice' | 'text',
): Promise<ToolExecution<IntakeResult>> {
  return executeToolWithRetry(
    'detectLanguage',
    async () => {
      const trimmed = rawInput.trim();
      const hasOdiaScript = /[\u0B00-\u0B7F]/.test(trimmed);
      const hasEnglish = /[a-zA-Z]/.test(trimmed);

      let detectedLanguage = 'or-IN';
      if (hasOdiaScript && !hasEnglish) {
        detectedLanguage = 'or-IN (Pure Odia)';
      } else if (hasOdiaScript && hasEnglish) {
        detectedLanguage = 'or-IN (Odia with English technical terms)';
      } else if (/kui|toda|kandha/i.test(trimmed)) {
        detectedLanguage = 'kui (Regional Tribal / Romanized)';
      } else if (hasEnglish) {
        detectedLanguage = 'en-IN / Romanized Odia';
      }

      return {
        text: trimmed,
        detectedLanguage,
        isVoice: inputMode === 'voice',
      };
    },
    () => ({
      text: rawInput.trim(),
      detectedLanguage: 'or-IN',
      isVoice: inputMode === 'voice',
    }),
  );
}

// ==========================================
// TOOL 2: CONCEPT MAPPER (UNDERSTAND)
// ==========================================

export interface UnderstandResult {
  conceptId: string;
  confidence: number;
  reason: string;
}

export async function mapDoubtToConceptTool(
  query: string,
  availableConcepts: ConceptRecord[],
): Promise<ToolExecution<UnderstandResult>> {
  return executeToolWithRetry(
    'conceptMapper',
    async () => {
      // Rule-based high precision keyword matcher over curriculum
      const lower = query.toLowerCase();

      // Priority matches for Class 9 Odisha Science
      if (/ପ୍ରାଚୀର|wall|ସେଲ୍ୟୁଲୋଜ|cellulose/i.test(lower)) {
        return { conceptId: 'sci-c5-cell-wall', confidence: 0.95, reason: 'Matched cell wall & cellulose keywords' };
      }
      if (/ଝିଲ୍ଲୀ|membrane|ବିସରଣ|diffusion/i.test(lower)) {
        return { conceptId: 'sci-c5-cell-membrane', confidence: 0.95, reason: 'Matched plasma membrane keywords' };
      }
      if (/ପରାସରଣ|osmosis/i.test(lower)) {
        return { conceptId: 'sci-c5-osmosis', confidence: 0.95, reason: 'Matched osmosis keywords' };
      }
      if (/ମାଇଟୋକଣ୍ଡ୍ରିଆ|mitochondria|ଶକ୍ତି|powerhouse|atp/i.test(lower)) {
        return { conceptId: 'sci-c5-mitochondria', confidence: 0.95, reason: 'Matched mitochondria powerhouse keywords' };
      }
      if (/ହରିତକଣିକା|କ୍ଲୋରୋପ୍ଲାଷ୍ଟ|chloroplast|ପ୍ଲାଷ୍ଟିଡ|plastid/i.test(lower)) {
        return { conceptId: 'sci-c5-plastids', confidence: 0.95, reason: 'Matched plastids & photosynthesis keywords' };
      }
      if (/ନ୍ୟୁକ୍ଲିଅସ୍|nucleus|ଗୁଣସୂତ୍ର|dna|chromosome/i.test(lower)) {
        return { conceptId: 'sci-c5-nucleus', confidence: 0.95, reason: 'Matched nucleus & chromosome keywords' };
      }
      if (/କୋଷଜୀବକ|cytoplasm|organelle/i.test(lower)) {
        return { conceptId: 'sci-c5-cytoplasm', confidence: 0.92, reason: 'Matched cytoplasm keywords' };
      }
      if (/ପାର୍ଥକ୍ୟ|ତୁଳନା|plant.*animal|ପ୍ରାଣୀ.*ଉଦ୍ଭିଦ/i.test(lower)) {
        return { conceptId: 'sci-c5-plant-vs-animal-cells', confidence: 0.9, reason: 'Matched plant vs animal cell comparison' };
      }
      if (/ତ୍ୱରଣ|acceleration|ମନ୍ଦନ|retardation/i.test(lower)) {
        return { conceptId: 'sci-c8-acceleration', confidence: 0.95, reason: 'Matched acceleration keywords' };
      }
      if (/ବେଗ|velocity|ଦ୍ରୁତି|speed/i.test(lower)) {
        return { conceptId: 'sci-c8-speed-velocity', confidence: 0.95, reason: 'Matched speed and velocity keywords' };
      }
      if (/ଦୂରତା|distance|ବିସ୍ଥାପନ|displacement/i.test(lower)) {
        return { conceptId: 'sci-c8-distance-displacement', confidence: 0.95, reason: 'Matched distance vs displacement keywords' };
      }
      if (/ଗତି|motion|ସ୍ଥିତି|rest|ସନ୍ଦର୍ଭ/i.test(lower)) {
        return { conceptId: 'sci-c8-motion-rest', confidence: 0.9, reason: 'Matched rest and motion concepts' };
      }
      if (/ସମୀକରଣ|equation|v=u|ut\+/i.test(lower)) {
        return { conceptId: 'sci-c8-equations-of-motion', confidence: 0.92, reason: 'Matched equations of motion' };
      }
      if (/ବୃତ୍ତୀୟ|circular/i.test(lower)) {
        return { conceptId: 'sci-c8-circular-motion', confidence: 0.95, reason: 'Matched uniform circular motion' };
      }

      // Default to fundamental cell basics if science query
      return {
        conceptId: availableConcepts[0]?.id ?? 'sci-c5-cell-basics',
        confidence: 0.7,
        reason: 'Fallback to foundational cell unit concept',
      };
    },
    () => ({
      conceptId: 'sci-c5-cell-basics',
      confidence: 0.5,
      reason: 'Rule-based fallback concept assignment',
    }),
  );
}

// ==========================================
// TOOL 3: DIAGNOSE (MASTERY & PREREQUISITES)
// ==========================================

export interface DiagnosisResult {
  currentScore: number;
  attempts: number;
  lastSeen: string | null;
  prerequisites: string[];
  unmasteredPrerequisites: Array<{ id: string; nameOr: string; nameEn: string; score: number }>;
  isMastered: boolean;
}

export async function diagnoseMasteryTool(
  queryable: Queryable,
  learnerId: string,
  conceptId: string,
): Promise<ToolExecution<DiagnosisResult>> {
  return executeToolWithRetry(
    'getMastery',
    async () => {
      const mastery = await getMastery(queryable, learnerId, conceptId);
      const currentScore = mastery ? mastery.score : 0.0;
      const attempts = mastery ? mastery.attempts : 0;
      const lastSeen = mastery ? mastery.lastSeen : null;

      const concept = await getConcept(queryable, conceptId);
      const prereqIds = concept?.prerequisites ?? [];

      const unmastered: Array<{ id: string; nameOr: string; nameEn: string; score: number }> = [];

      for (const pId of prereqIds) {
        const pMastery = await getMastery(queryable, learnerId, pId);
        const pScore = pMastery ? pMastery.score : 0.0;
        if (pScore < 0.5) {
          const pConcept = await getConcept(queryable, pId);
          unmastered.push({
            id: pId,
            nameOr: pConcept?.nameOr ?? pId,
            nameEn: pConcept?.nameEn ?? pId,
            score: pScore,
          });
        }
      }

      return {
        currentScore,
        attempts,
        lastSeen,
        prerequisites: prereqIds,
        unmasteredPrerequisites: unmastered,
        isMastered: currentScore >= 0.8,
      };
    },
    () => ({
      currentScore: 0.0,
      attempts: 0,
      lastSeen: null,
      prerequisites: [],
      unmasteredPrerequisites: [],
      isMastered: false,
    }),
  );
}

// ==========================================
// TOOL 5: TEACH (ODIA MICRO-LESSON <= 150 WORDS)
// ==========================================

export interface MicroLessonResult {
  lessonTextOdia: string;
  lessonExample: string;
  wordCount: number;
}

export async function generateMicroLessonTool(
  conceptId: string,
  conceptNameOr: string,
  conceptNameEn: string,
): Promise<ToolExecution<MicroLessonResult>> {
  return executeToolWithRetry(
    'generateMicroLesson',
    async () => {
      // Check pre-cached curriculum capsules for authentic local analogies
      const matchingCapsule = CLASS_9_CURRICULUM.find(
        (c) =>
          c.id.includes(conceptId) ||
          c.topicNameEnglish.toLowerCase().includes(conceptNameEn.toLowerCase()) ||
          conceptId.includes('cell') && c.id.includes('cell') ||
          conceptId.includes('motion') && c.id.includes('motion'),
      );

      let lessonText = '';
      let example = '';

      if (conceptId.includes('cell-wall')) {
        lessonText =
          'କୋଷ ପ୍ରାଚୀର (Cell Wall) କେବଳ ଉଦ୍ଭିଦ କୋଷରେ ଦେଖାଯାଏ | ଏହା ସେଲ୍ୟୁଲୋଜ୍ (Cellulose) ରେ ନିର୍ମିତ ଏକ ଦୃଢ଼ ବାହାର ଆବରଣ ଅଟେ | ଏହା କୋଷକୁ ନିର୍ଦ୍ଦିଷ୍ଟ ଆକାର ଦିଏ ଏବଂ ଝଡ଼-ବର୍ଷାରୁ ରକ୍ଷା କରେ | ପ୍ରାଣୀ କୋଷରେ କୋଷ ପ୍ରାଚୀର ନଥାଏ |';
        example = 'ଗାଁ ମାଟି ଘରର ବାହାର ମାଟି କାନ୍ଥ (Boundary Wall) ପରି, ଯାହା ଝଡ଼-ବର୍ଷାରେ ଘରକୁ ସିଧା ଠିଆ କରି ରଖେ |';
      } else if (conceptId.includes('cell-membrane')) {
        lessonText =
          'କୋଷ ଝିଲ୍ଲୀ (Plasma Membrane) ପ୍ରାଣୀ ଓ ଉଦ୍ଭିଦ ଉଭୟ କୋଷରେ ଥାଏ | ଏହା ଏକ ଅର୍ଦ୍ଧ-ପାରଗମ୍ୟ (Semi-permeable) ଝିଲ୍ଲୀ | ଏହା କେବଳ ଆବଶ୍ୟକୀୟ ପୋଷକ ତତ୍ତ୍ୱକୁ ଭିତରକୁ ଛାଡ଼େ ଏବଂ ବର୍ଜ୍ୟବସ୍ତୁକୁ ବାହାର କରେ |';
        example = 'ଘରର ଜାଲି କବାଟ (Screen Door) ପରି, ଯାହା ପବନ ଛାଡ଼େ କିନ୍ତୁ ମଶା-ମାଛିକୁ ଅଟକାଏ |';
      } else if (conceptId.includes('mitochondria')) {
        lessonText =
          'ମାଇଟୋକଣ୍ଡ୍ରିଆ (Mitochondria) କୁ କୋଷର ଶକ୍ତି କେନ୍ଦ୍ର (Powerhouse of the Cell) କୁହାଯାଏ | ଏହା ଶ୍ୱସନ କ୍ରିୟା ଦ୍ୱାରା ATP ଆକାରରେ ଶକ୍ତି ଉତ୍ପାଦନ କରେ, ଯାହା କୋଷର ସମସ୍ତ କାର୍ଯ୍ୟ ପାଇଁ ଆବଶ୍ୟକ |';
        example = 'ଗାଁ ଘରେ ବିଦ୍ୟୁତ୍ ଦେଉଥିବା ଲଣ୍ଠନ ବା ଜେନେରେଟର ପରି, ଯାହା ଘରକୁ ଆଲୋକ ଓ ଶକ୍ତି ଯୋଗାଏ |';
      } else if (conceptId.includes('acceleration')) {
        lessonText =
          'ତ୍ୱରଣ (Acceleration) ହେଉଛି ସମୟ ଅନୁସାରେ ବେଗର ପରିବର୍ତ୍ତନ ହାର (Rate of Change of Velocity) | ସୂତ୍ର: a = (v - u) / t | ଯଦି ବେଗ ବଢ଼େ ତାହା ତ୍ୱରଣ, ଏବଂ ବେଗ କମିଲେ ତାହା ମନ୍ଦନ (Retardation) ଅଟେ |';
        example = 'ସାଇକେଲ୍ ପେଡାଲ୍ ଜୋରରେ ମାରିଲେ ବେଗ ବଢ଼ିବା (ତ୍ୱରଣ), ଏବଂ ବ୍ରେକ୍ ଚାପିଲେ ସାଇକେଲ୍ ଅଟକିବା (ମନ୍ଦନ) |';
      } else if (matchingCapsule) {
        lessonText = matchingCapsule.summaryOdia;
        example = `${matchingCapsule.ruralAnalogy.metaphorTitleOdia}: ${matchingCapsule.ruralAnalogy.explanationOdia}`;
      } else {
        lessonText = `${conceptNameOr} (${conceptNameEn}) ହେଉଛି ଓଡ଼ିଶା ବୋର୍ଡ ନବମ ଶ୍ରେଣୀ ବିଜ୍ଞାନର ଏକ ପ୍ରମୁଖ ବିଷୟ | ଏହାର ମୂଳ ଧାରଣା ବୁଝିବା ପରୀକ୍ଷା ପାଇଁ ଅତ୍ୟନ୍ତ ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ |`;
        example = 'ଗାଁର ଦୈନନ୍ଦିନ ଅନୁଭୂତି ସହିତ ଏହି ନିୟମକୁ ଯୋଡ଼ି ଦେଖିବା |';
      }

      // Ensure word count constraint: <= 150 words
      const words = lessonText.split(/\s+/).filter(Boolean);
      const cappedText = words.length > 150 ? words.slice(0, 150).join(' ') + '...' : lessonText;

      return {
        lessonTextOdia: cappedText,
        lessonExample: example,
        wordCount: cappedText.split(/\s+/).filter(Boolean).length,
      };
    },
    () => ({
      lessonTextOdia: `${conceptNameOr} (${conceptNameEn}) ହେଉଛି ନବମ ଶ୍ରେଣୀର ଏକ ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ ଧାରଣା | ଏହାକୁ ସରଳ ଭାବେ ବୁଝିବା ନିହାତି ଜରୁରୀ |`,
      lessonExample: 'ଦୈନନ୍ଦିନ ଉଦାହରଣ: ପ୍ରତ୍ୟେକ କାର୍ଯ୍ୟ ପଛରେ ବିଜ୍ଞାନର ନିୟମ ରହିଛି |',
      wordCount: 30,
    }),
  );
}

// ==========================================
// TOOL 6: CHECK (QUIZ GENERATION & GRADING)
// ==========================================

export interface QuizQuestion {
  id: string;
  questionOdia: string;
  questionEnglish?: string;
  options: string[];
  correctAnswer: string;
  hintOdia: string;
}

export interface QuizResult {
  questions: QuizQuestion[];
  gradedScore: number | null;
  feedbackOdia: string | null;
}

export async function generateOrGradeQuizTool(
  conceptId: string,
  providedAnswers?: Record<string, string> | null,
): Promise<ToolExecution<QuizResult>> {
  return executeToolWithRetry(
    'generateOrGradeQuiz',
    async () => {
      let questions: QuizQuestion[] = [];

      if (conceptId.includes('cell-wall') || conceptId.includes('cell-membrane')) {
        questions = [
          {
            id: 'q1',
            questionOdia: 'କୋଷ ପ୍ରାଚୀର (Cell Wall) ମୁଖ୍ୟତଃ କେଉଁଥିରେ ନିର୍ମିତ?',
            questionEnglish: 'What is the Plant Cell Wall primarily made of?',
            options: ['A) ଲିପିଡ୍ (Lipids)', 'B) ସେଲ୍ୟୁଲୋଜ୍ (Cellulose)', 'C) ପ୍ରୋଟିନ୍ (Protein)', 'D) ଜଳ (Water)'],
            correctAnswer: 'B',
            hintOdia: 'ଏହା ଉଦ୍ଭିଦକୁ ଦୃଢ଼ତା ଦେଉଥିବା ଏକ କାର୍ବୋହାଇଡ୍ରେଟ୍ |',
          },
          {
            id: 'q2',
            questionOdia: 'ପ୍ରାଣୀ କୋଷ (Animal Cell) ରେ ନିମ୍ନଲିଖିତ ମଧ୍ୟରୁ କେଉଁଟି ନଥାଏ?',
            questionEnglish: 'Which of the following is ABSENT in animal cells?',
            options: ['A) କୋଷ ଝିଲ୍ଲୀ (Cell Membrane)', 'B) ନ୍ୟୁକ୍ଲିଅସ୍ (Nucleus)', 'C) କୋଷ ପ୍ରାଚୀର (Cell Wall)', 'D) ମାଇଟୋକଣ୍ଡ୍ରିଆ (Mitochondria)'],
            correctAnswer: 'C',
            hintOdia: 'ଉଦ୍ଭିଦ ଘୁଞ୍ଚିପାରେ ନାହିଁ ତେଣୁ ତାହାକୁ ଅତିରିକ୍ତ ସୁରକ୍ଷା ଦରକାର |',
          },
        ];
      } else if (conceptId.includes('mitochondria')) {
        questions = [
          {
            id: 'q1',
            questionOdia: 'କୋଷର ଶକ୍ତି କେନ୍ଦ୍ର (Powerhouse of the Cell) କାହାକୁ କୁହାଯାଏ?',
            questionEnglish: 'Which organelle is known as the Powerhouse of the Cell?',
            options: ['A) ଲାଇସୋଜୋମ୍ (Lysosome)', 'B) ମାଇଟୋକଣ୍ଡ୍ରିଆ (Mitochondria)', 'C) ରାଇବୋଜୋମ୍ (Ribosome)', 'D) ନ୍ୟୁକ୍ଲିଅସ୍ (Nucleus)'],
            correctAnswer: 'B',
            hintOdia: 'ଏହା କୋଷ ପାଇଁ ATP ରୂପରେ ଶକ୍ତି ତିଆରି କରେ |',
          },
          {
            id: 'q2',
            questionOdia: 'ମାଇଟୋକଣ୍ଡ୍ରିଆରେ ଶକ୍ତି କେଉଁ ରୂପରେ ସଞ୍ଚିତ ହୁଏ?',
            questionEnglish: 'Energy in mitochondria is produced in the form of?',
            options: ['A) DNA', 'B) RNA', 'C) ATP', 'D) Glucose'],
            correctAnswer: 'C',
            hintOdia: 'ଏହାକୁ କୋଷର ଶକ୍ତି ମୁଦ୍ରା (Energy Currency) କୁହାଯାଏ |',
          },
        ];
      } else {
        questions = [
          {
            id: 'q1',
            questionOdia: 'ତ୍ୱରଣ (Acceleration) ର ଏସ୍.ଆଇ (SI) ଏକକ କଣ?',
            questionEnglish: 'What is the SI unit of Acceleration?',
            options: ['A) m/s', 'B) m/s²', 'C) km/h', 'D) m·s'],
            correctAnswer: 'B',
            hintOdia: 'ବେଗର ଏକକ (m/s) କୁ ସମୟ (s) ଦ୍ୱାରା ଭାଗ କଲେ ମିଳେ |',
          },
          {
            id: 'q2',
            questionOdia: 'ଯଦି ବସ୍ତୁର ବେଗ ସମୟ ସହିତ କମିଯାଏ, ତେବେ ତାହାକୁ କଣ କୁହାଯାଏ?',
            questionEnglish: 'Negative acceleration is called?',
            options: ['A) ସମବେଗ (Uniform Velocity)', 'B) ମନ୍ଦନ (Retardation)', 'C) ଦ୍ରୁତି (Speed)', 'D) ବିସ୍ଥାପନ (Displacement)'],
            correctAnswer: 'B',
            hintOdia: 'ସାଇକେଲ୍ରେ ବ୍ରେକ୍ ଚାପିଲେ ଏହା ଘଟେ |',
          },
        ];
      }

      // Grade answers if student supplied them
      let gradedScore: number | null = null;
      let feedbackOdia: string | null = null;

      if (providedAnswers && Object.keys(providedAnswers).length > 0) {
        let correctCount = 0;
        for (const q of questions) {
          const userAns = providedAnswers[q.id]?.trim().toUpperCase();
          if (userAns && (userAns === q.correctAnswer || userAns.startsWith(q.correctAnswer))) {
            correctCount++;
          }
        }
        gradedScore = questions.length > 0 ? correctCount / questions.length : 1.0;
        if (gradedScore >= 0.8) {
          feedbackOdia = 'ଚମତ୍କାର! ତୁମେ ସବୁ ପ୍ରଶ୍ନର ସଠିକ୍ ଉତ୍ତର ଦେଇଛ | ତୁମର ଧାରଣା ସମ୍ପୂର୍ଣ୍ଣ ସ୍ପଷ୍ଟ ଅଛି!';
        } else if (gradedScore >= 0.5) {
          feedbackOdia = 'ଭଲ ଚେଷ୍ଟା! ଗୋଟିଏ ପ୍ରଶ୍ନ ଠିକ୍ ହୋଇଛି, ଆଉ ଟିକେ ଧ୍ୟାନ ଦେଲେ ତୁମେ ସମ୍ପୂର୍ଣ୍ଣ ସଠିକ୍ କରିପାରିବ |';
        } else {
          feedbackOdia = 'କିଛି ଚିନ୍ତା ନାହିଁ! ଚାଲ ଆଉ ଥରେ ସରଳ ଭାବେ ଉଦାହରଣ ଦେଖିବା |';
        }
      }

      return {
        questions,
        gradedScore,
        feedbackOdia,
      };
    },
    () => ({
      questions: [
        {
          id: 'q1',
          questionOdia: 'କୋଷ ସମ୍ବନ୍ଧୀୟ ଏହି ଧାରଣାଟି କଣ ତୁମକୁ ସ୍ପଷ୍ଟ ହେଲା?',
          options: ['A) ହଁ, ସମ୍ପୂର୍ଣ୍ଣ ସ୍ପଷ୍ଟ', 'B) ଆଉ ଟିକେ ବୁଝିବା ଦରକାର'],
          correctAnswer: 'A',
          hintOdia: 'ମୌଳିକ ଉଦାହରଣ ମନେ ପକାଅ |',
        },
      ],
      gradedScore: null,
      feedbackOdia: null,
    }),
  );
}

// ==========================================
// TOOL 7: UPDATE MASTERY
// ==========================================

export async function updateMasteryTool(
  queryable: Queryable,
  learnerId: string,
  conceptId: string,
  newScore: number,
  nextReviewAt: string,
): Promise<ToolExecution<MasteryRecord>> {
  return executeToolWithRetry(
    'recordMastery',
    async () => {
      return await recordMasteryAttempt(queryable, {
        learnerId,
        conceptId,
        score: newScore,
        nextReviewAt,
      });
    },
    () => ({
      learnerId,
      conceptId,
      score: newScore,
      attempts: 1,
      lastSeen: new Date().toISOString(),
      nextReviewAt,
    }),
  );
}

// ==========================================
// TOOL 8: SCHEDULE FOLLOWUP & UNPROMPTED HOOK
// ==========================================

export interface FollowupSchedulingResult {
  scheduledFollowup: FollowupRecord;
  unpromptedFollowupDue: {
    hasDueFollowup: boolean;
    conceptId?: string;
    conceptNameOr?: string;
    conceptNameEn?: string;
    hookTextOdia?: string;
  } | null;
}

export async function scheduleFollowupTool(
  queryable: Queryable,
  learnerId: string,
  conceptId: string,
  conceptNameOr: string,
  conceptNameEn: string,
  dueAt: string,
  payload: Record<string, unknown> = {},
): Promise<ToolExecution<FollowupSchedulingResult>> {
  return executeToolWithRetry(
    'scheduleFollowup',
    async () => {
      // 1. Create future followup
      const scheduledFollowup = await createFollowup(queryable, {
        learnerId,
        conceptId,
        dueAt,
        status: 'pending',
        payload,
      });

      // 2. Check if learner has past due followups ready to open unprompted on next session
      const dueFollowups = await getDueFollowups(queryable, learnerId, new Date());
      let unprompted: FollowupSchedulingResult['unpromptedFollowupDue'] = null;

      if (dueFollowups.length > 0) {
        const oldestDue = dueFollowups[0];
        const pastConcept = await getConcept(queryable, oldestDue.conceptId);
        unprompted = {
          hasDueFollowup: true,
          conceptId: oldestDue.conceptId,
          conceptNameOr: pastConcept?.nameOr ?? oldestDue.conceptId,
          conceptNameEn: pastConcept?.nameEn ?? oldestDue.conceptId,
          hookTextOdia: `ନମସ୍କାର! ଗତ ଅଧ୍ୟୟନରେ ଆମେ "${pastConcept?.nameOr ?? 'ବିଜ୍ଞାନ ବିଷୟ'}" ପଢ଼ିଥିଲେ | ଚାଲ ଦେଖିବା ତୁମର ମନେ ଅଛି କି ନାହିଁ!`,
        };
      }

      return {
        scheduledFollowup,
        unpromptedFollowupDue: unprompted,
      };
    },
    () => ({
      scheduledFollowup: {
        id: `fup_fallback_${Date.now()}`,
        learnerId,
        conceptId,
        dueAt,
        status: 'pending',
        payload,
        createdAt: new Date().toISOString(),
      },
      unpromptedFollowupDue: null,
    }),
  );
}
