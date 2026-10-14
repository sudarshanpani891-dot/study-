/**
 * MatiSathi Offline Storage & Synchronization Engine
 * Manages local IndexedDB / localStorage cache, offline doubt queue,
 * and automatic synchronization upon network reconnection.
 */

import {
  CLASS_9_CURRICULUM,
  DEFAULT_STUDENT_PROFILE,
  INITIAL_MASTERY_STATE,
} from './curriculum-kb';
import { searchCurriculumKB, recordDiagnosticFinding, updateMasteryMatrix, scheduleProactiveNudge } from './tools';
import type {
  ConceptMastery,
  DecisionTraceStep,
  AgentDoubtResponse,
  QueuedOfflineDoubt,
  StudentProfile,
  SyncPayload,
  SyncResponse,
  ProactiveNudge,
  LearnerDoubtRecord,
} from './types';

const STORAGE_KEYS = {
  PROFILE: 'matisathi_student_profile',
  MASTERY: 'matisathi_mastery_matrix',
  OFFLINE_QUEUE: 'matisathi_offline_doubts_queue',
  DECISION_TRACES: 'matisathi_recent_traces',
  PROACTIVE_NUDGE: 'matisathi_active_proactive_nudge',
  LEARNER_DOUBTS: 'matisathi_learner_doubts_history',
};

// ==================== Local Storage Helpers ====================

const memoryStore: Record<string, string> = {};

function safeGetItem<T>(key: string, defaultValue: T): T {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : defaultValue;
    }
    const memRaw = memoryStore[key];
    return memRaw ? (JSON.parse(memRaw) as T) : defaultValue;
  } catch (err) {
    console.warn(`[MatiSathiStorage] Error reading ${key}:`, err);
    return defaultValue;
  }
}

function safeSetItem<T>(key: string, value: T): void {
  try {
    const serialized = JSON.stringify(value);
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(key, serialized);
    } else {
      memoryStore[key] = serialized;
    }
  } catch (err) {
    console.warn(`[MatiSathiStorage] Error writing ${key}:`, err);
  }
}

// ==================== Exported Storage API ====================

export function clearStorageForTesting(): void {
  for (const k of Object.keys(memoryStore)) delete memoryStore[k];
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.clear();
  }
}

export function getCachedStudentProfile(): StudentProfile {
  return safeGetItem<StudentProfile>(STORAGE_KEYS.PROFILE, DEFAULT_STUDENT_PROFILE);
}

export function saveCachedStudentProfile(profile: StudentProfile): void {
  safeSetItem(STORAGE_KEYS.PROFILE, profile);
}

export function getCachedMastery(): Record<string, ConceptMastery> {
  return safeGetItem<Record<string, ConceptMastery>>(STORAGE_KEYS.MASTERY, INITIAL_MASTERY_STATE);
}

export function saveCachedMastery(mastery: Record<string, ConceptMastery>): void {
  safeSetItem(STORAGE_KEYS.MASTERY, mastery);
}

export const DEFAULT_LEARNER_DOUBTS: LearnerDoubtRecord[] = [
  {
    id: 'doubt-bernoulli-01',
    query: 'ଭାରୀ ଉଡ଼ାଜାହାଜ ଆକାଶରେ କିପରି ଉଡ଼ିପାରେ? ବର୍ନୌଲିଙ୍କ ସିଦ୍ଧାନ୍ତ (Bernoulli’s Principle) କିପରି କାମ କରେ?',
    subject: 'Physics / Flight',
    topicOdia: 'ଉଡ଼ାଜାହାଜ ଓ ବର୍ନୌଲିଙ୍କ ସିଦ୍ଧାନ୍ତ',
    topicEnglish: 'Aeroplane Flight & Bernoulli Principle',
    timestamp: 'Yesterday @ 07:15 PM',
    masteryScore: 78,
    progressPercent: 75,
    quizSolved: true,
    selectedOptionId: 'A',
    taskCompleted: true,
    scheduledReviewDate: 'Tomorrow @ 07:00 PM (Evening Study Window)',
    nextFollowupPromptOdia: 'ବର୍ନୌଲିଙ୍କ ସିଦ୍ଧାନ୍ତ ଅନୁସାରେ ଡେଣାର କେଉଁ ପାର୍ଶ୍ୱରେ ବାୟୁର ବେଗ ଅଧିକ ହୁଏ ଏବଂ କାହିଁକି?',
    nextFollowupPromptEnglish: 'According to Bernoulli, why is airspeed higher over the curved upper surface of an aerofoil?',
    whatToDoNextOdia: 'ଆସନ୍ତାକାଲି ସନ୍ଧ୍ୟା ୭:୦୦ ରେ ଏଜେଣ୍ଟ ଏହି ପ୍ରଶ୍ନ ପଚାରିବ | କାଗଜ ଷ୍ଟ୍ରିପ୍ ପରୀକ୍ଷା ମନେ ପକାନ୍ତୁ |',
    whatToDoNextEnglish: 'Agent will ask this follow-up challenge tomorrow at 7:00 PM. Review the paper-strip air pressure experiment.',
    learningPlan: {
      goalSummaryOdia: 'ବର୍ନୌଲି ସିଦ୍ଧାନ୍ତ ଓ ବିମାନ ଉଡ଼ାଣର ମୌଳିକ ନିୟମ ବୁଝିବା |',
      goalSummaryEnglish: 'Understand aerodynamic lift generation through Bernoulli’s principle.',
      stages: [
        { stageNumber: 1, titleOdia: 'ପବନର ବେଗ ଓ ଚାପ ସମ୍ପର୍କ', titleEnglish: 'Air Velocity vs Pressure', descriptionOdia: 'ବେଗ ବଢ଼ିଲେ ଚାପ କମିଯାଏ |', descriptionEnglish: 'High speed creates low static pressure.', status: 'completed' },
        { stageNumber: 2, titleOdia: 'ଉଡ଼ାଜାହାଜ ଡେଣାର ଗଠନ (Aerofoil)', titleEnglish: 'Cambered Aerofoil Geometry', descriptionOdia: 'ଉପର ବକ୍ରତା ଅଧିକ ବେଗ ସୃଷ୍ଟି କରେ |', descriptionEnglish: 'Curvature forces air to travel faster.', status: 'completed' },
        { stageNumber: 3, titleOdia: 'ଇଣ୍ଟରାକ୍ଟିଭ୍ କ୍ଵିଜ୍ ଚ୍ୟାଲେଞ୍ଜ', titleEnglish: 'Practice Challenge Quiz', descriptionOdia: 'ଚାପ ପାର୍ଥକ୍ୟ ଦ୍ୱାରା Lift ବଳ ନିର୍ଣ୍ଣୟ |', descriptionEnglish: 'Calculate upward pressure imbalance.', status: 'completed' },
        { stageNumber: 4, titleOdia: 'ସ୍ପେସ୍ଡ୍ ଫଲୋ-ଅପ୍ ରିଭ୍ୟୁ', titleEnglish: 'Spaced Repetition Review', descriptionOdia: 'ଆସନ୍ତାକାଲି ସନ୍ଧ୍ୟାରେ ପରୀକ୍ଷା |', descriptionEnglish: 'Scheduled for tomorrow evening window.', status: 'upcoming' },
      ],
      allocatedNextReviewDate: 'Tomorrow @ 07:00 PM (ଆସନ୍ତାକାଲି ସନ୍ଧ୍ୟା)',
      followupChallengePromptOdia: 'ଉଡ଼ାଜାହାଜ ଓଜନ ବଢ଼ିଲେ ଡେଣାର ଆକାର କିମ୍ବା ବେଗ କିପରି ବଦଳିବା ଆବଶ୍ୟକ?',
      followupChallengePromptEnglish: 'How must wing surface area or airspeed adjust as aircraft payload increases?',
    },
    interactiveChallenge: {
      id: 'quiz-bernoulli-01',
      questionOdia: 'ବର୍ନୌଲିଙ୍କ ସିଦ୍ଧାନ୍ତ ଅନୁସାରେ ଏକ ପ୍ରବାହୀ (fluid) ର ବେଗ ବଢ଼ିଲେ ତାର ଚାପ ଉପରେ କି ପ୍ରଭାବ ପଡ଼େ?',
      questionEnglish: 'According to Bernoulli’s Principle, what happens to the fluid pressure when its flow velocity increases?',
      options: [
        { id: 'A', textOdia: 'ଚାପ ହ୍ରାସ ପାଏ (Pressure decreases)', textEnglish: 'Static pressure decreases', isCorrect: true, explanationOdia: 'ସଠିକ୍! ବେଗ ବୃଦ୍ଧି ହେଲେ ଚାପ କମିଯାଏ, ଯାହା ଲିଫ୍ଟ ବଳ ଦିଏ |', explanationEnglish: 'Correct! Pressure drops creating net upward aerodynamic lift.' },
        { id: 'B', textOdia: 'ଚାପ ସ୍ଥିର ରହେ (Pressure remains constant)', textEnglish: 'Pressure remains constant', isCorrect: false, explanationOdia: 'ଭୁଲ୍ |', explanationEnglish: 'Incorrect.' },
        { id: 'C', textOdia: 'ଚାପ ବହୁତ ବଢ଼ିଯାଏ (Pressure increases significantly)', textEnglish: 'Pressure increases significantly', isCorrect: false, explanationOdia: 'ଭୁଲ୍ |', explanationEnglish: 'Incorrect.' },
        { id: 'D', textOdia: 'କୌଣସି ପ୍ରଭାବ ପଡ଼େ ନାହିଁ', textEnglish: 'No measurable effect', isCorrect: false, explanationOdia: 'ଭୁଲ୍ |', explanationEnglish: 'Incorrect.' },
      ],
    },
    actionTask: {
      id: 'task-bernoulli-01',
      titleOdia: 'ହାଲୁକା କାଗଜ ଷ୍ଟ୍ରିପ୍ ପରୀକ୍ଷଣ',
      titleEnglish: 'Paper Strip Aerodynamic Lift Experiment',
      instructionsOdia: 'ଏକ ଛୋଟ କାଗଜ ଷ୍ଟ୍ରିପ୍ ଓଠ ଆଗରେ ରଖି ତା ଉପର ପଟେ ଜୋରରେ ଫୁଙ୍କନ୍ତୁ | କାଗଜଟି ତଳକୁ ନ ଖସି ଉପରକୁ ଉଠିବା ଦେଖନ୍ତୁ |',
      instructionsEnglish: 'Hold a paper strip just below your lower lip and blow vigorously across the top surface. Watch the paper lift upward.',
      expectedOutcomeOdia: 'ଉପର ଚାପ କମିଯିବାରୁ ତଳ ଚାପ କାଗଜକୁ ଉପରକୁ ଉଠାଇବ (Bernoulli Lift) |',
      expectedOutcomeEnglish: 'The high airspeed drops upper static pressure, causing higher air pressure beneath to push the paper up.',
    },
  },
  {
    id: 'doubt-soil-02',
    query: 'ଡାଲି ଜାତୀୟ ଫସଲ ଲଗାଇଲେ ମାଟିର ଉର୍ବରତା କିପରି ବଢ଼େ? ନାଇଟ୍ରୋଜେନ୍ ସ୍ଥିରୀକରଣ (Nitrogen Fixation) କ’ଣ?',
    subject: 'Agriculture & Biology',
    topicOdia: 'ମାଟି ଉର୍ବରତା ଓ ଫସଲ ଚକ୍ର',
    topicEnglish: 'Soil Health & Crop Rotation',
    timestamp: '2 Days Ago @ 06:40 PM',
    masteryScore: 70,
    progressPercent: 65,
    quizSolved: false,
    taskCompleted: true,
    scheduledReviewDate: 'Tomorrow @ 08:30 PM (Evening Study Window)',
    nextFollowupPromptOdia: 'ଡାଲି ଜାତୀୟ ଗଛର ଚେରରେ ଥିବା ରାଇଜୋବିୟମ୍ (Rhizobium) ବ୍ୟାକ୍ଟେରିଆ ବାୟୁମଣ୍ଡଳରୁ କିପରି ନାଇଟ୍ରୋଜେନ୍ ଶୋଷି ମାଟିକୁ ଦିଏ?',
    nextFollowupPromptEnglish: 'How do Rhizobium symbiotic bacteria residing in legume root nodules fix atmospheric nitrogen for soil enrichment?',
    whatToDoNextOdia: 'ଆସନ୍ତାକାଲି ୮:୩୦ ରେ ସ୍ୱୟଂଚାଳିତ ପ୍ରଶ୍ନ ପୂର୍ବରୁ ଅଭ୍ୟାସ କ୍ଵିଜ୍ ସମାଧାନ କରନ୍ତୁ (+10 XP) |',
    whatToDoNextEnglish: 'Solve the remaining practice quiz challenge below to secure +10 XP before tomorrow’s 8:30 PM follow-up.',
    learningPlan: {
      goalSummaryOdia: 'ଫସଲ ଚକ୍ର ଓ ଜୈବିକ ନାଇଟ୍ରୋଜେନ୍ ସ୍ଥିରୀକରଣର ଗୁରୁତ୍ୱ ବୁଝିବା |',
      goalSummaryEnglish: 'Understand legume root symbiosis and biological nitrogen fixation in soil replenishment.',
      stages: [
        { stageNumber: 1, titleOdia: 'ଗାଁ ଚାଷ ଜମି ଓ ଫସଲ ବଦଳ ଉଦାହରଣ', titleEnglish: 'Village Crop Rotation Practice', descriptionOdia: 'ଧାନ ପରେ ମୁଗ ବା ବିରି ଲଗାଇବା |', descriptionEnglish: 'Planting pulses after paddy to restore soil health.', status: 'completed' },
        { stageNumber: 2, titleOdia: 'ରାଇଜୋବିୟମ୍ ଓ ଚେର ଗଣ୍ଠି', titleEnglish: 'Rhizobium Root Nodules', descriptionOdia: 'ବାୟୁମଣ୍ଡଳୀୟ ନାଇଟ୍ରୋଜେନ୍ ସ୍ଥିରୀକରଣ |', descriptionEnglish: 'Symbiotic atmospheric nitrogen conversion.', status: 'completed' },
        { stageNumber: 3, titleOdia: 'ଅଭ୍ୟାସ କ୍ଵିଜ୍ ସମାଧାନ', titleEnglish: 'Practice Recall Challenge', descriptionOdia: 'ନିଜ ବୁଝାମଣା ପରୀକ୍ଷା କରନ୍ତୁ |', descriptionEnglish: 'Solve the 4-choice practice challenge.', status: 'in_progress' },
        { stageNumber: 4, titleOdia: 'ସ୍ପେସ୍ଡ୍ ନାଇଟ୍ରୋଜେନ୍ ଫଲୋ-ଅପ୍', titleEnglish: 'Spaced Recall on Soil Microbes', descriptionOdia: 'କାଲି ସନ୍ଧ୍ୟା ୮:୩୦ ରେ ଚ୍ୟାଲେଞ୍ଜ |', descriptionEnglish: 'Scheduled for tomorrow 8:30 PM.', status: 'upcoming' },
      ],
      allocatedNextReviewDate: 'Tomorrow @ 08:30 PM (ଆସନ୍ତାକାଲି ସନ୍ଧ୍ୟା)',
      followupChallengePromptOdia: 'ରାଇଜୋବିୟମ୍ ବ୍ୟାକ୍ଟେରିଆ ବାୟୁରୁ ନାଇଟ୍ରୋଜେନ୍ କୁ କେଉଁ ରୂପକୁ ପରିବର୍ତ୍ତନ କରି ଗଛକୁ ଯୋଗାଏ?',
      followupChallengePromptEnglish: 'Into which chemical form do root nodule bacteria convert atmospheric nitrogen (N₂) for plant absorption?',
    },
    interactiveChallenge: {
      id: 'quiz-soil-02',
      questionOdia: 'ଡାଲି ଜାତୀୟ ଫସଲ (Legumes) ର ଚେର ଗଣ୍ଠିରେ ବାସ କରୁଥିବା ଉପକାରୀ ବ୍ୟାକ୍ଟେରିଆର ନାମ କ’ଣ?',
      questionEnglish: 'Which symbiotic bacterium resides in the root nodules of leguminous plants to fix atmospheric nitrogen?',
      options: [
        { id: 'A', textOdia: 'ରାଇଜୋବିୟମ୍ (Rhizobium)', textEnglish: 'Rhizobium', isCorrect: true, explanationOdia: 'ସଠିକ୍! ରାଇଜୋବିୟମ୍ ବାୟୁମଣ୍ଡଳରୁ ନାଇଟ୍ରୋଜେନ୍ ଗ୍ରହଣ କରି ମାଟିକୁ ଉର୍ବର କରେ |', explanationEnglish: 'Correct! Rhizobium fixes inert atmospheric N₂ into bioavailable nitrates.' },
        { id: 'B', textOdia: 'ଇ କୋଲାଇ (E. coli)', textEnglish: 'Escherichia coli', isCorrect: false, explanationOdia: 'ଭୁଲ୍ |', explanationEnglish: 'Incorrect.' },
        { id: 'C', textOdia: 'ଭାଇରସ୍ (Tobacco Mosaic Virus)', textEnglish: 'Virus', isCorrect: false, explanationOdia: 'ଭୁଲ୍ |', explanationEnglish: 'Incorrect.' },
        { id: 'D', textOdia: 'କବକ ବା ଫଙ୍ଗସ୍ (Bread Mold)', textEnglish: 'Mold', isCorrect: false, explanationOdia: 'ଭୁଲ୍ |', explanationEnglish: 'Incorrect.' },
      ],
    },
    actionTask: {
      id: 'task-soil-02',
      titleOdia: 'ମୁଗ କିମ୍ବା ବାଦାମ ଗଛର ଚେର ଗଣ୍ଠି ନିରୀକ୍ଷଣ',
      titleEnglish: 'Legume Root Nodule Observation',
      instructionsOdia: 'ବାଡ଼ିରୁ ଏକ ଛୋଟ ଡାଲି ଜାତୀୟ ବା ଘାସ ଗଛ ଚେର ସହିତ ଉପାଡ଼ି ପାଣିରେ ଧୋଇ ଦେଖନ୍ତୁ | ସୋରିଷ ଦାନା ପରି ଛୋଟ ଗଣ୍ଠି ଦେଖାଯିବ |',
      instructionsEnglish: 'Gently uproot a wild clover, bean, or peanut plant and rinse the roots in water to observe pinkish root nodules.',
      expectedOutcomeOdia: 'ଆପଣ ନିଜ ଆଖିରେ ପ୍ରାକୃତିକ ନାଇଟ୍ରୋଜେନ୍ କାରଖାନା (Root Nodules) ଦେଖିପାରିବେ |',
      expectedOutcomeEnglish: 'You can clearly observe biological nitrogen factories supporting sustainable soil fertility.',
    },
  },
  {
    id: 'doubt-earthen-pot-03',
    query: 'ଗ୍ରୀଷ୍ମ ଦିନେ ମାଟି କଳସୀର ପାଣି ଥଣ୍ଡା କାହିଁକି ରହେ? ଏଥିରେ ବାଷ୍ପୀଭବନ (Evaporation) କିପରି କାମ କରେ?',
    subject: 'Daily Life & Physics',
    topicOdia: 'ମାଟି କଳସୀ ପାଣି ଓ ବାଷ୍ପୀଭବନ',
    topicEnglish: 'Evaporative Cooling in Earthen Pots',
    timestamp: '3 Days Ago @ 08:10 PM',
    masteryScore: 82,
    progressPercent: 85,
    quizSolved: true,
    selectedOptionId: 'B',
    taskCompleted: true,
    scheduledReviewDate: 'In 2 Days @ 06:30 PM (ସନ୍ଧ୍ୟା)',
    nextFollowupPromptOdia: 'ପବନ ବହିଲେ କଳସୀର ପାଣି ଅଧିକ ଶୀଘ୍ର ଥଣ୍ଡା ହୁଏ କାହିଁକି? ବାଷ୍ପୀଭବନ ହାର କିପରି ବଦଳେ?',
    nextFollowupPromptEnglish: 'Why does wind speed accelerate evaporative cooling in an earthen pitcher?',
    whatToDoNextOdia: 'ଆସନ୍ତା ୨ ଦିନ ପରେ ଏଜେଣ୍ଟ ପବନର ବେଗ ଓ ଆର୍ଦ୍ରତା ଉପରେ ଚ୍ୟାଲେଞ୍ଜ ଦେବ | ଲୁକ୍କାୟିତ ତାପ (Latent Heat) ମନେ ପକାନ୍ତୁ |',
    whatToDoNextEnglish: 'Agent will follow up on humidity and wind velocity effects. Review latent heat of vaporization.',
    learningPlan: {
      goalSummaryOdia: 'ମାଟି କଳସୀର ଛିଦ୍ର ମାଧ୍ୟମରେ ବାଷ୍ପୀଭବନ ଓ ଲୁକ୍କାୟିତ ତାପର ଧାରଣା ବୁଝିବା |',
      goalSummaryEnglish: 'Understand latent heat absorption during capillary evaporative cooling.',
      stages: [
        { stageNumber: 1, titleOdia: 'ମାଟିର ସୂକ୍ଷ୍ମ ଛିଦ୍ର (Pores)', titleEnglish: 'Microscopic Clay Pores', descriptionOdia: 'ପାଣି ଝରି ବାହାରକୁ ଆସେ |', descriptionEnglish: 'Water seeps via microscopic capillary channels.', status: 'completed' },
        { stageNumber: 2, titleOdia: 'ବାଷ୍ପୀଭବନର ଲୁକ୍କାୟିତ ତାପ', titleEnglish: 'Latent Heat of Vaporization', descriptionOdia: 'ଭିତର ପାଣିରୁ ତାପ ଶୋଷି ବାଷ୍ପ ହୁଏ |', descriptionEnglish: 'Liquid absorbs thermal energy to evaporate.', status: 'completed' },
        { stageNumber: 3, titleOdia: 'ଅଭ୍ୟାସ କ୍ଵିଜ୍ ସମାଧାନ', titleEnglish: 'Practice Recall Test', descriptionOdia: '୧୦୦% ସଠିକ୍ ସମାଧାନ ସମାପ୍ତ |', descriptionEnglish: 'Completed with full score.', status: 'completed' },
        { stageNumber: 4, titleOdia: 'ସ୍ପେସ୍ଡ୍ ରିଟେନସନ୍ ଫଲୋ-ଅପ୍', titleEnglish: 'Spaced Retention Check', descriptionOdia: '୨ ଦିନ ପରେ ପରୀକ୍ଷା |', descriptionEnglish: 'Scheduled for in 2 days.', status: 'upcoming' },
      ],
      allocatedNextReviewDate: 'In 2 Days @ 06:30 PM (୨ ଦିନ ପରେ)',
      followupChallengePromptOdia: 'ଯଦି ମାଟି କଳସୀ ଉପରେ ପଲିଥିନ୍ ଗୁଡ଼ାଇ ଦିଆଯାଏ, ତେବେ ପାଣି ଥଣ୍ଡା ରହିବ କି?',
      followupChallengePromptEnglish: 'If an earthen pot is wrapped tightly in plastic wrap, will it still cool water?',
    },
    interactiveChallenge: {
      id: 'quiz-pot-03',
      questionOdia: 'ମାଟି କଳସୀର ପାଣି ବାଷ୍ପୀଭବନ ହେବା ପାଇଁ ଆବଶ୍ୟକ ଲୁକ୍କାୟିତ ତାପ (Latent Heat) କେଉଁଠାରୁ ସଂଗ୍ରହ କରେ?',
      questionEnglish: 'Where does evaporating water in an earthen pot obtain its latent heat of vaporization?',
      options: [
        { id: 'A', textOdia: 'ସୂର୍ଯ୍ୟଙ୍କ ସିଧାସଳଖ କିରଣରୁ', textEnglish: 'Direct cosmic radiation', isCorrect: false, explanationOdia: 'ଭୁଲ୍ |', explanationEnglish: 'Incorrect.' },
        { id: 'B', textOdia: 'କଳସୀରେ ଥିବା ବଳକା ପାଣି ଓ ମାଟି କାନ୍ଥରୁ (ଯାହା ତାପମାତ୍ରା କମାଇ ଦିଏ)', textEnglish: 'From the remaining water and pot surface (causing cooling)', isCorrect: true, explanationOdia: 'ସଠିକ୍! ପାଣି ନିଜ ତାପ ହରାଇ ବାଷ୍ପ ହୁଏ, ତେଣୁ ଥଣ୍ଡା ରହେ |', explanationEnglish: 'Correct! Heat is extracted from the residual liquid, lowering its temperature.' },
        { id: 'C', textOdia: 'କୌଣସି ତାପ ଆବଶ୍ୟକ ହୁଏ ନାହିଁ', textEnglish: 'No thermal energy is exchanged', isCorrect: false, explanationOdia: 'ଭୁଲ୍ |', explanationEnglish: 'Incorrect.' },
        { id: 'D', textOdia: 'ବାୟୁମଣ୍ଡଳର ଧୂଳିକଣାରୁ', textEnglish: 'From airborne dust particles', isCorrect: false, explanationOdia: 'ଭୁଲ୍ |', explanationEnglish: 'Incorrect.' },
      ],
    },
    actionTask: {
      id: 'task-pot-03',
      titleOdia: 'ହାତ ପାପୁଲିରେ ସ୍ପିରିଟ୍ ବା ପାଣି ବାଷ୍ପୀଭବନ ଅନୁଭବ',
      titleEnglish: 'Palm Evaporation Cooling Sensation',
      instructionsOdia: 'ହାତ ପାପୁଲିରେ କିଛି ପାଣି ବା ସାନିଟାଇଜର୍ ଲଗାଇ ଫୁଙ୍କନ୍ତୁ | ଥଣ୍ଡା ଅନୁଭୂତି ପରୀକ୍ଷା କରନ୍ତୁ |',
      instructionsEnglish: 'Place a drop of water or sanitizer on your palm and blow air on it to feel the rapid cooling effect.',
      expectedOutcomeOdia: 'ପାପୁଲିରୁ ତାପ ଶୋଷି ବାଷ୍ପ ହେଉଥିବାରୁ ତୁରନ୍ତ ଥଣ୍ଡା ଲାଗିବ |',
      expectedOutcomeEnglish: 'Your hand will instantly feel cooler as latent heat is drawn away from your skin.',
    },
  },
];

export function getCachedLearnerDoubts(): LearnerDoubtRecord[] {
  return safeGetItem<LearnerDoubtRecord[]>(STORAGE_KEYS.LEARNER_DOUBTS, []);
}

export function saveCachedLearnerDoubts(doubts: LearnerDoubtRecord[]): void {
  safeSetItem(STORAGE_KEYS.LEARNER_DOUBTS, doubts);
}

export function recordLearnerDoubt(record: LearnerDoubtRecord): void {
  const current = getCachedLearnerDoubts();
  const existingIdx = current.findIndex((d) => d.id === record.id || d.query === record.query);
  let updated: LearnerDoubtRecord[];
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = { ...updated[existingIdx], ...record };
  } else {
    updated = [record, ...current];
  }
  saveCachedLearnerDoubts(updated);
}

export function updateLearnerDoubtProgress(doubtId: string, updates: Partial<LearnerDoubtRecord>): void {
  const current = getCachedLearnerDoubts();
  const updated = current.map((d) => (d.id === doubtId ? { ...d, ...updates } : d));
  saveCachedLearnerDoubts(updated);
}

export function getOfflineQueuedDoubts(): QueuedOfflineDoubt[] {
  return safeGetItem<QueuedOfflineDoubt[]>(STORAGE_KEYS.OFFLINE_QUEUE, []);
}

export function enqueueOfflineDoubt(doubt: QueuedOfflineDoubt): void {
  const current = getOfflineQueuedDoubts();
  safeSetItem(STORAGE_KEYS.OFFLINE_QUEUE, [doubt, ...current]);
}

export function clearSyncedDoubts(syncedIds: string[]): void {
  const current = getOfflineQueuedDoubts();
  const remaining = current.filter((item) => !syncedIds.includes(item.id));
  safeSetItem(STORAGE_KEYS.OFFLINE_QUEUE, remaining);
}

export function getActiveProactiveNudge(): ProactiveNudge | null {
  return safeGetItem<ProactiveNudge | null>(STORAGE_KEYS.PROACTIVE_NUDGE, null);
}

export function setActiveProactiveNudge(nudge: ProactiveNudge | null): void {
  safeSetItem(STORAGE_KEYS.PROACTIVE_NUDGE, nudge);
}

// ==================== Pure Offline Response Generator ====================

/**
 * When totally offline (no signal in rural village), generates an immediate,
 * high-fidelity pedagogical response directly from local cache and creates
 * a transparent decision trace.
 */
export function generateLocalOfflineResponse(
  query: string,
  inputMode: 'voice' | 'text',
): AgentDoubtResponse {
  const startTime = Date.now();
  const searchResult = searchCurriculumKB(query);
  const capsule = searchResult.matchedCapsule;
  const diagnostic = recordDiagnosticFinding(capsule, query);
  const mastery = getCachedMastery();
  const masteryResult = updateMasteryMatrix(mastery, capsule.id, diagnostic.hasMisconception, false);

  // Update cached mastery
  const updatedMastery: Record<string, ConceptMastery> = {
    ...mastery,
    [capsule.id]: {
      ...mastery[capsule.id],
      masteryScore: masteryResult.newScore,
      totalDoubtsAsked: (mastery[capsule.id]?.totalDoubtsAsked || 0) + 1,
      lastStudiedAt: new Date().toISOString(),
      status: masteryResult.status,
    },
  };
  saveCachedMastery(updatedMastery);

  // Create local trace
  const decisionTrace: DecisionTraceStep[] = [
    {
      id: `trace-off-1-${Date.now()}`,
      stepIndex: 1,
      nodeName: 'offline_ingest',
      title: 'Offline Query Normalization',
      titleOdia: 'ଅଫଲାଇନ୍ ପ୍ରଶ୍ନ ବିଶ୍ଳେଷଣ',
      actionType: 'state_transition',
      reasoning: 'Operating in Zero-Signal Offline Mode. Executing local curriculum search without remote network calls.',
      reasoningOdia: 'ଅଫଲାଇନ୍ ମୋଡ୍ ସକ୍ରିୟ | ଇଣ୍ଟରନେଟ୍ ବିନା ସିଧାସଳଖ ଫୋନରୁ ପାଠ୍ୟଖସଡ଼ା ଖୋଜାଗଲା |',
      timestamp: new Date().toISOString(),
      durationMs: 8,
    },
    {
      id: `trace-off-2-${Date.now()}`,
      stepIndex: 2,
      nodeName: 'offline_retrieval',
      title: 'Local Curriculum Cache Lookup (Tool)',
      titleOdia: 'ସ୍ଥାନୀୟ କ୍ୟାଶ୍ ରୁ ପାଠ୍ୟଖସଡ଼ା ତଥ୍ୟ (Tool Call)',
      actionType: 'tool_call',
      toolName: 'searchCurriculumKB',
      toolInput: { query, grade: 9, source: 'indexeddb_cache' },
      toolOutput: { capsuleId: capsule.id, topicOdia: capsule.topicNameOdia },
      reasoning: `Found cached capsule "${capsule.topicNameEnglish}" with pre-indexed Odia rural analogy.`,
      reasoningOdia: `ସ୍ଥାନୀୟ ମେମୋରୀରୁ "${capsule.topicNameOdia}" ଏବଂ ଗାଁ ଉଦାହରଣ ମିଳିଲା |`,
      timestamp: new Date().toISOString(),
      durationMs: 12,
    },
    {
      id: `trace-off-3-${Date.now()}`,
      stepIndex: 3,
      nodeName: 'offline_mastery_update',
      title: 'Local Mastery Update (Tool)',
      titleOdia: 'ସ୍ଥାନୀୟ ଦକ୍ଷତା ସ୍କୋର ଅଦ୍ୟତନ (Tool Call)',
      actionType: 'tool_call',
      toolName: 'updateMasteryMatrix',
      toolInput: { conceptId: capsule.id, previousScore: masteryResult.previousScore },
      toolOutput: { newScore: masteryResult.newScore, delta: masteryResult.delta },
      reasoning: `Updated student mastery locally from ${masteryResult.previousScore}% to ${masteryResult.newScore}%. Queued for cloud sync upon network reconnect.`,
      reasoningOdia: `ଦକ୍ଷତା ସ୍କୋର ${masteryResult.previousScore}% ରୁ ବୃଦ୍ଧି ପାଇ ${masteryResult.newScore}% ହେଲା | ନେଟୱାର୍କ ଆସିଲେ ସର୍ଭରରେ ସିଙ୍କ୍ ହେବ |`,
      timestamp: new Date().toISOString(),
      durationMs: 15,
    },
  ];

  const profile = getCachedStudentProfile();
  const studentDisplayName = profile?.nameOdia || profile?.name || 'ସାଥୀ';

  // Compose answer
  const explanationOdia = [
    `ନମସ୍କାର ${studentDisplayName}! (ଅଫଲାଇନ୍ ପାଠ୍ୟ ସହାୟକ)`,
    capsule.summaryOdia,
    `\n🌾 **ଗାଁ ଉଦାହରଣ (${capsule.ruralAnalogy.metaphorTitleOdia}):**`,
    capsule.ruralAnalogy.explanationOdia,
    diagnostic.hasMisconception
      ? `\n💡 **ସତର୍କତା:** ${diagnostic.correctionGuidanceOdia}`
      : '',
  ]
    .filter(Boolean)
    .join('\n');

  const doubtRecord: QueuedOfflineDoubt = {
    id: `doubt-off-${Date.now()}`,
    timestamp: new Date().toISOString(),
    queryText: query,
    inputMode,
    responseSummaryOdia: capsule.topicNameOdia,
    conceptId: capsule.id,
    synced: false,
  };
  enqueueOfflineDoubt(doubtRecord);

  const proactiveNudge = scheduleProactiveNudge(capsule.id, capsule, diagnostic.hasMisconception);
  setActiveProactiveNudge(proactiveNudge);

  const learningPlan = {
    goalSummaryOdia: `"${capsule.topicNameOdia}" ବିଷୟରେ ଦକ୍ଷତା ହାସଲ କରିବା |`,
    goalSummaryEnglish: `Master core principles and applications of ${capsule.topicNameEnglish}.`,
    stages: [
      {
        stageNumber: 1,
        titleOdia: 'ପ୍ରାଥମିକ ଧାରଣା ଓ ଉଦାହରଣ',
        titleEnglish: 'Core Intuition & Analogy',
        descriptionOdia: capsule.ruralAnalogy.explanationOdia,
        descriptionEnglish: capsule.ruralAnalogy.explanationEnglish,
        status: 'completed' as const,
      },
      {
        stageNumber: 2,
        titleOdia: 'ବୈଜ୍ଞାନିକ ପରିଭାଷା',
        titleEnglish: 'Technical Precision',
        descriptionOdia: 'ପ୍ରମୁଖ ପରିଭାଷା ଓ ସୂତ୍ରର ଅନୁଶୀଳନ |',
        descriptionEnglish: 'Key rules and scientific terms.',
        status: 'in_progress' as const,
      },
      {
        stageNumber: 3,
        titleOdia: 'ଚ୍ୟାଲେଞ୍ଜ କୁଇଜ୍ ଓ ପ୍ରୟୋଗ',
        titleEnglish: 'Interactive Practice',
        descriptionOdia: 'ପ୍ରଶ୍ନୋତ୍ତର ପରୀକ୍ଷା ଓ ପ୍ରାକ୍ଟିକାଲ୍ ଟାସ୍କ |',
        descriptionEnglish: 'Solve interactive exercise.',
        status: 'upcoming' as const,
      },
      {
        stageNumber: 4,
        titleOdia: 'ସ୍ପେସ୍ଡ୍ ଫଲୋ-ଅପ୍',
        titleEnglish: 'Spaced Recall Review',
        descriptionOdia: 'ଆସନ୍ତାକାଲି ପୁନରାବୃତ୍ତି ପରୀକ୍ଷା |',
        descriptionEnglish: 'Autonomous review tomorrow.',
        status: 'upcoming' as const,
      },
    ],
    allocatedNextReviewDate: 'Tomorrow @ Evening Study Window (ଆସନ୍ତାକାଲି ସନ୍ଧ୍ୟା)',
    followupChallengePromptOdia: `ଆସନ୍ତାକାଲି ${capsule.topicNameOdia} ସମ୍ବନ୍ଧରେ ଏକ ପ୍ରୟୋଗାତ୍ମକ ପ୍ରଶ୍ନର ସମାଧାନ କରିବା କି?`,
    followupChallengePromptEnglish: `Tomorrow we will test your applied recall for ${capsule.topicNameEnglish}.`,
  };

  const interactiveChallenge = {
    id: `quiz-off-${capsule.id}`,
    questionOdia: `${capsule.topicNameOdia} ବିଷୟରେ କେଉଁଟି ସଠିକ୍?`,
    questionEnglish: `Which of the following is correct regarding ${capsule.topicNameEnglish}?`,
    options: [
      {
        id: 'A',
        textOdia: 'ଏହା ପ୍ରକୃତି ବା ବାସ୍ତବ ପ୍ରଣାଳୀର ମୌଳିକ ନିୟମ ଅନୁସରଣ କରେ |',
        textEnglish: 'It follows the fundamental physical or biological principle.',
        isCorrect: true,
        explanationOdia: 'ସଠିକ୍! ଏହା ହିଁ ମୁଖ୍ୟ କାରଣ |',
        explanationEnglish: 'Correct! This aligns with the governing law.',
      },
      {
        id: 'B',
        textOdia: 'ଏହା ବିନା କୌଣସି କାରଣ ବା ଶକ୍ତିରେ ଆପେ ଆପେ ଘଟେ |',
        textEnglish: 'It occurs spontaneously without any energy transformation.',
        isCorrect: false,
        explanationOdia: 'ଭୁଲ; ଏହା ପାଇଁ ନିର୍ଦ୍ଦିଷ୍ଟ ଶକ୍ତି ବା ପରିସ୍ଥିତି ଆବଶ୍ୟକ |',
        explanationEnglish: 'Incorrect; specific conditions and energy are required.',
      },
      {
        id: 'C',
        textOdia: 'ଏହାର ବାସ୍ତବ ଜୀବନ ସହ କୌଣସି ସମ୍ପର୍କ ନାହିଁ |',
        textEnglish: 'It has no connection to everyday observation.',
        isCorrect: false,
        explanationOdia: 'ଭୁଲ; ଦୈନନ୍ଦିନ ଜୀବନରେ ଏହାର ପ୍ରତ୍ୟକ୍ଷ ପ୍ରଭାବ ରହିଛି |',
        explanationEnglish: 'Incorrect; everyday phenomena directly depend on this.',
      },
      {
        id: 'D',
        textOdia: 'ଉପରୋକ୍ତ କୌଣସିଟି ନୁହେଁ |',
        textEnglish: 'None of the above.',
        isCorrect: false,
        explanationOdia: 'ଭୁଲ |',
        explanationEnglish: 'Incorrect.',
      },
    ],
  };

  const actionTask = {
    id: `task-off-${capsule.id}`,
    titleOdia: `ଘରେ କିମ୍ବା ପରିବେଶରେ ପରୀକ୍ଷା (${capsule.topicNameOdia})`,
    titleEnglish: `Hands-on Exploration (${capsule.topicNameEnglish})`,
    instructionsOdia: `ଆପଣଙ୍କ ଘରେ କିମ୍ବା ଆଖପାଖରେ ଏହି ନିୟମ କିପରି କାର୍ଯ୍ୟକାରୀ ହେଉଛି ତାହା ୧ ମିନିଟ୍ ନିରୀକ୍ଷଣ କରନ୍ତୁ |`,
    instructionsEnglish: `Observe how this principle works in your immediate surroundings for 1 minute.`,
    expectedOutcomeOdia: `ଆପଣ ଏହି ଧାରଣାର ପ୍ରତ୍ୟକ୍ଷ ପ୍ରମାଣ ନିଜ ଆଖିରେ ଦେଖିପାରିବେ |`,
    expectedOutcomeEnglish: `You will observe direct evidence of this concept in real life.`,
  };

  return {
    doubtId: doubtRecord.id,
    queryText: query,
    detectedSubject: capsule.subject,
    detectedTopicOdia: capsule.topicNameOdia,
    detectedTopicEnglish: capsule.topicNameEnglish,
    prerequisites: ['ମୌଳିକ ଧାରଣା (Foundational Concepts)'],
    explanationOdia,
    explanationEnglish: capsule.ruralAnalogy.explanationEnglish,
    englishKeywords: capsule.keyTerms.map((t) => t.english),
    ruralMetaphorUsed: capsule.ruralAnalogy.metaphorTitleOdia,
    misconceptionIdentified: diagnostic.misconceptionDescriptionOdia,
    learningPlan,
    interactiveChallenge,
    actionTask,
    masteryDelta: masteryResult.delta,
    updatedMasteryScore: masteryResult.newScore,
    pedagogicalStrategy: 'rural_analogy',
    proactiveNextStep: {
      promptOdia: proactiveNudge.nudgePromptOdia,
      promptEnglish: proactiveNudge.nudgePromptEnglish,
      conceptId: capsule.id,
      scheduledFor: 'Tomorrow @ Evening Study Window (ଆସନ୍ତାକାଲି ସନ୍ଧ୍ୟା)',
    },
    decisionTrace,
    source: 'offline_capsule',
  };
}

// ==================== Network Sync ====================

/**
 * Syncs all pending offline doubts and mastery updates with the backend
 */
export async function syncPendingDoubts(): Promise<SyncResponse> {
  const queued = getOfflineQueuedDoubts();
  const mastery = getCachedMastery();
  const profile = getCachedStudentProfile();

  if (queued.length === 0) {
    return {
      success: true,
      syncedCount: 0,
      timestamp: new Date().toISOString(),
      nextProactiveNudge: getActiveProactiveNudge(),
    };
  }

  const payload: SyncPayload = {
    studentId: profile.id,
    queuedDoubts: queued,
    masteryUpdates: mastery,
  };

  try {
    const res = await fetch('/api/matisathi/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data: SyncResponse = await res.json();
      clearSyncedDoubts(queued.map((q) => q.id));
      if (data.nextProactiveNudge) {
        setActiveProactiveNudge(data.nextProactiveNudge);
      }
      return data;
    }
  } catch (err) {
    console.warn('[MatiSathiStorage] Remote sync attempt failed:', err);
  }

  // Graceful fallback if sync endpoint unreachable
  return {
    success: false,
    syncedCount: 0,
    timestamp: new Date().toISOString(),
    nextProactiveNudge: getActiveProactiveNudge(),
  };
}
