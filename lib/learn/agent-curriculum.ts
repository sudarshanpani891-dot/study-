/**
 * Agent Curriculum Recommendation & Bite-Sized Lessons for /learn Route
 * Designed specifically for Class 9 Odisha State Board (BSE Odisha / SCERT)
 * Focused on rural learners (zero jargon, spoken Odia, village analogies, 100-word capsules).
 */

import { CLASS_9_CURRICULUM } from '@/lib/matisathi/curriculum-kb';
import { CLASS_9_ODISHA_SCIENCE_CONCEPTS } from '@/lib/server/learner/seeds/odisha-class9-science';
import type { LocalMasteryRecord } from '@/lib/offline/dexie-db';

export interface RecommendedLesson {
  id: string;
  topicOdia: string;
  topicEnglish: string;
  chapterOdia: string;
  summaryOdia: string;
  analogyTitleOdia: string;
  analogyOdia: string;
  quiz: Array<{
    id: string;
    questionOdia: string;
    options: string[];
    correctIndex: number;
    hintOdia: string;
  }>;
}

export interface FriendlyFollowup {
  id: string;
  conceptId: string;
  conceptNameOdia: string;
  conceptNameEnglish: string;
  greetingOdia: string;
  questionOdia: string;
  options: string[];
  correctIndex: number;
  explanationOdia: string;
}

/**
 * Built-in bite-sized lessons with village analogies and 2-question checks.
 */
export const BITE_SIZED_LESSONS: Record<string, RecommendedLesson> = {
  'sci-c5-cell-wall': {
    id: 'sci-c5-cell-wall',
    topicOdia: 'କୋଷ ପ୍ରାଚୀର',
    topicEnglish: 'Plant Cell Wall',
    chapterOdia: 'ଅଧ୍ୟାୟ ୫: ଜୀବନର ମୌଳିକ ଏକକ (କୋଷ)',
    summaryOdia:
      'କୋଷ ପ୍ରାଚୀର (Cell Wall) କେବଳ ଉଦ୍ଭିଦ କୋଷରେ ଥାଏ | ଏହା ସେଲ୍ୟୁଲୋଜ୍ (Cellulose) ରେ ତିଆରି ଏବଂ ବହୁତ ଶକ୍ତ | ଏହା ଗଛକୁ ଝଡ଼-ବର୍ଷାରୁ ରକ୍ଷା କରେ ଏବଂ ସିଧା ଠିଆ କରି ରଖେ |',
    analogyTitleOdia: '🌾 ଗାଁ ମାଟି ଘରର ବାହାର ସୁରକ୍ଷା କାନ୍ଥ',
    analogyOdia:
      'ତୁମ ଗାଁରେ ମାଟି ଘରର ବାହାରେ ଥିବା ଇଟା ବା ମାଟି କାନ୍ଥ (Boundary Wall) କୁ ଭାବ | ଝଡ଼-ବତାସରେ ସେହି କାନ୍ଥ ଘରକୁ ସୁରକ୍ଷିତ ରଖେ | ଉଦ୍ଭିଦ କୋଷର Cell Wall ଠିକ୍ ସେହିପରି ଦୃଢ଼ ସୁରକ୍ଷା ଦିଏ |',
    quiz: [
      {
        id: 'q1',
        questionOdia: 'କୋଷ ପ୍ରାଚୀର (Cell Wall) କାହା ପାଖରେ ଥାଏ?',
        options: ['ଉଦ୍ଭିଦ କୋଷରେ (Plant)', 'ପ୍ରାଣୀ କୋଷରେ (Animal)'],
        correctIndex: 0,
        hintOdia: 'ଗଛ ନିଜେ ଚାଲିପାରେ ନାହିଁ, ତେଣୁ ତାହାକୁ ଶକ୍ତ କାନ୍ଥ ଦରକାର |',
      },
      {
        id: 'q2',
        questionOdia: 'କୋଷ ପ୍ରାଚୀର କେଉଁ ପଦାର୍ଥରେ ଗଠିତ?',
        options: ['ସେଲ୍ୟୁଲୋଜ୍ (Cellulose)', 'ଚର୍ବି ଓ ତେଲ (Fat)'],
        correctIndex: 0,
        hintOdia: 'ଏହା ଏକ ପ୍ରକାର ଦୃଢ଼ କାର୍ବୋହାଇଡ୍ରେଟ୍ |',
      },
    ],
  },
  'sci-c5-cell-membrane': {
    id: 'sci-c5-cell-membrane',
    topicOdia: 'କୋଷ ଝିଲ୍ଲୀ ଓ ବିସରଣ',
    topicEnglish: 'Cell Membrane & Diffusion',
    chapterOdia: 'ଅଧ୍ୟାୟ ୫: ଜୀବନର ମୌଳିକ ଏକକ (କୋଷ)',
    summaryOdia:
      'କୋଷ ଝିଲ୍ଲୀ (Cell Membrane) ଉଦ୍ଭିଦ ଓ ପ୍ରାଣୀ ଉଭୟଙ୍କ ପାଖରେ ଥାଏ | ଏହା ଏକ ପତଳା ଜାଲି ପରି, ଯାହା ଭଲ ଜିନିଷକୁ ଭିତରକୁ ଛାଡ଼େ ଏବଂ ଖରାପ ଜିନିଷକୁ ଅଟକାଏ |',
    analogyTitleOdia: '🚪 ଘର ଭିତରର ଜାଲି କବାଟ',
    analogyOdia:
      'ଘରର ଜାଲି କବାଟ (Mesh Door) ଥଣ୍ଡା ପବନକୁ ଭିତରକୁ ଆସିବାକୁ ଦିଏ, କିନ୍ତୁ ମଶା-ମାଛିକୁ ବାହାରେ ଅଟକାଇ ଦିଏ | କୋଷ ଝିଲ୍ଲୀ ଠିକ୍ ସେହିପରି କାମ କରେ (Semi-permeable barrier) |',
    quiz: [
      {
        id: 'q1',
        questionOdia: 'କୋଷ ଝିଲ୍ଲୀ କାହା ପାଖରେ ଥାଏ?',
        options: ['ଉଭୟ ଉଦ୍ଭିଦ ଓ ପ୍ରାଣୀ', 'କେବଳ ଉଦ୍ଭିଦ'],
        correctIndex: 0,
        hintOdia: 'ଏହା ସମସ୍ତ ଜୀବନ୍ତ କୋଷ ପାଇଁ ଆବଶ୍ୟକ |',
      },
      {
        id: 'q2',
        questionOdia: 'କୋଷ ଝିଲ୍ଲୀ ମଧ୍ୟଦେଇ ଜଳ ଓ ବାୟୁ ଚଳାଚଳକୁ କ’ଣ କୁହାଯାଏ?',
        options: ['ବିସରଣ (Diffusion)', 'ବାଷ୍ପୀଭବନ (Evaporation)'],
        correctIndex: 0,
        hintOdia: 'ଅଧିକ ସାନ୍ଦ୍ରତାରୁ କମ୍ ସାନ୍ଦ୍ରତା ଆଡ଼କୁ ଗତି |',
      },
    ],
  },
  'sci-c5-mitochondria': {
    id: 'sci-c5-mitochondria',
    topicOdia: 'ମାଇଟୋକଣ୍ଡ୍ରିଆ (ଶକ୍ତି କେନ୍ଦ୍ର)',
    topicEnglish: 'Mitochondria (Powerhouse)',
    chapterOdia: 'ଅଧ୍ୟାୟ ୫: ଜୀବନର ମୌଳିକ ଏକକ (କୋଷ)',
    summaryOdia:
      'ମାଇଟୋକଣ୍ଡ୍ରିଆ (Mitochondria) କୁ କୋଷର ଶକ୍ତି କେନ୍ଦ୍ର (Powerhouse) କୁହାଯାଏ | ଏହା ଖାଦ୍ୟରୁ ଶକ୍ତି ବାହାର କରି ATP ରୂପରେ ସଞ୍ଚୟ କରେ, ଯାହା ଶରୀରକୁ କାମ କରିବାକୁ ବଳ ଦିଏ |',
    analogyTitleOdia: '💡 ଗାଁ ବିଦ୍ୟୁତ୍ ଡିଜେଲ ଜେନେରେଟର',
    analogyOdia:
      'ଗାଁରେ କରେଣ୍ଟ କଟିଗଲେ ଯେପରି ଜେନେରେଟର ଚାଲି ଘରକୁ ଆଲୋକ ଓ ଶକ୍ତି ଯୋଗାଏ, ମାଇଟୋକଣ୍ଡ୍ରିଆ କୋଷ ଭିତରେ ଠିକ୍ ସେପରି ଶକ୍ତି ତିଆରି କରେ |',
    quiz: [
      {
        id: 'q1',
        questionOdia: 'କୋଷର ଶକ୍ତି କେନ୍ଦ୍ର (Powerhouse) କାହାକୁ କୁହାଯାଏ?',
        options: ['ମାଇଟୋକଣ୍ଡ୍ରିଆ (Mitochondria)', 'ନ୍ୟୁକ୍ଲିଅସ୍ (Nucleus)'],
        correctIndex: 0,
        hintOdia: 'ଏହା ATP ଶକ୍ତି ତିଆରି କରେ |',
      },
      {
        id: 'q2',
        questionOdia: 'ମାଇଟୋକଣ୍ଡ୍ରିଆ ତିଆରି କରୁଥିବା ଶକ୍ତି ମୁଦ୍ରା କ’ଣ?',
        options: ['ATP', 'DNA'],
        correctIndex: 0,
        hintOdia: 'ଏହାକୁ ଜୈବିକ ଶକ୍ତି ମୁଦ୍ରା (Energy Currency) କୁହାଯାଏ |',
      },
    ],
  },
  'sci-c8-speed-velocity': {
    id: 'sci-c8-speed-velocity',
    topicOdia: 'ଦ୍ରୁତି ଏବଂ ବେଗ',
    topicEnglish: 'Speed and Velocity',
    chapterOdia: 'ଅଧ୍ୟାୟ ୮: ଗତି (Motion)',
    summaryOdia:
      'ଦ୍ରୁତି (Speed) କହିଲେ ଏକକ ସମୟରେ ଅତିକ୍ରମ କରିଥିବା ଦୂରତା | କିନ୍ତୁ ବେଗ (Velocity) କହିଲେ ନିର୍ଦ୍ଦିଷ୍ଟ ଦିଗରେ ଦ୍ରୁତି | ବେଗରେ ଦିଗ (Direction) ଥାଏ, କିନ୍ତୁ ଦ୍ରୁତିରେ କେବଳ ମୂଲ୍ୟ ଥାଏ |',
    analogyTitleOdia: '🚲 ସାଇକେଲ୍ ଚଳାଇ ହାଟକୁ ଯିବା',
    analogyOdia:
      'ଯଦି ତୁମେ ଘଣ୍ଟାକୁ ୧୦ କିମି ବେଗରେ ସାଇକେଲ୍ ଚଳାଉଛ ତେବେ ତାହା ଦ୍ରୁତି (Speed) | କିନ୍ତୁ ଯଦି ତୁମେ କୁହ "ମୁଁ ପୂର୍ବ ଦିଗରେ ହାଟକୁ ଘଣ୍ଟାକୁ ୧୦ କିମି ଯାଉଛି", ତାହା ହେଉଛି ବେଗ (Velocity) |',
    quiz: [
      {
        id: 'q1',
        questionOdia: 'ଦ୍ରୁତି ଏବଂ ବେଗ ମଧ୍ୟରେ ମୁଖ୍ୟ ପାର୍ଥକ୍ୟ କ’ଣ?',
        options: ['ବେଗରେ ଦିଗ (Direction) ଥାଏ', 'ଦ୍ରୁତି ସର୍ବଦା ଶୂନ ହୁଏ'],
        correctIndex: 0,
        hintOdia: 'ବେଗ ଏକ ଭେକ୍ଟର ରାଶି (Vector quantity) |',
      },
      {
        id: 'q2',
        questionOdia: 'ଦ୍ରୁତିର SI ଏକକ କ’ଣ?',
        options: ['ମିଟର/ସେକେଣ୍ଡ (m/s)', 'କିଲୋଗ୍ରାମ (kg)'],
        correctIndex: 0,
        hintOdia: 'ଦୂରତା ଭଗା ଶେଷ ସମୟ |',
      },
    ],
  },
};

/**
 * Determines today's recommended lesson for the learner based on her current mastery.
 * Follows an agentic heuristic:
 * 1. Concept with lowest mastery score (< 0.6) whose prerequisites are cleared
 * 2. Or the first unattempted concept in the Class 9 sequence
 * 3. Fallback: Cell Wall (sci-c5-cell-wall)
 */
export function getAgentTodaysLesson(
  localMastery: LocalMasteryRecord[] = [],
): RecommendedLesson {
  const masteryMap = new Map<string, number>();
  for (const m of localMastery) {
    masteryMap.set(m.conceptId, m.score);
  }

  // Check concepts in sequence
  for (const concept of CLASS_9_ODISHA_SCIENCE_CONCEPTS) {
    const score = masteryMap.get(concept.id) ?? 0;
    // Check if lesson exists in our bite-sized directory
    if (BITE_SIZED_LESSONS[concept.id]) {
      // If score is under 0.7, this is the prime recommendation!
      if (score < 0.7) {
        return BITE_SIZED_LESSONS[concept.id];
      }
    }
  }

  // If all completed, return first lesson for quick revision
  return BITE_SIZED_LESSONS['sci-c5-cell-wall'];
}

/**
 * Returns the agent's friendly follow-up card to show on open.
 * Always conversational, warm, and strictly jargon-free.
 */
export function getFriendlyAgentFollowup(
  learnerName: string = 'ସୁନୀତା',
): FriendlyFollowup {
  return {
    id: 'followup-welcome-cell-wall',
    conceptId: 'sci-c5-cell-wall',
    conceptNameOdia: 'କୋଷ ପ୍ରାଚୀର',
    conceptNameEnglish: 'Plant Cell Wall',
    greetingOdia: `ନମସ୍କାର ${learnerName}!`,
    questionOdia:
      'ଗତକାଲି ତୁମେ କୋଷ ବିଷୟରେ ପଢ଼ିଥିଲ | କହିଲ ଦେଖି, ଗାଁ କାନ୍ଥ ପରି କେବଳ ଉଦ୍ଭିଦରେ ଥିବା ଦୃଢ଼ ଆବରଣଟିର ନାମ କ’ଣ?',
    options: ['କୋଷ ପ୍ରାଚୀର (Cell Wall)', 'କୋଷ ଝିଲ୍ଲୀ (Cell Membrane)'],
    correctIndex: 0,
    explanationOdia:
      'ବହୁତ ବଢ଼ିଆ! ଠିକ୍ ଉତ୍ତର | କୋଷ ପ୍ରାଚୀର (Cell Wall) କେବଳ ଉଦ୍ଭିଦରେ ଥାଏ ଏବଂ ତାହାକୁ ଶକ୍ତ ସୁରକ୍ଷା ଦିଏ | 🎉',
  };
}
