/**
 * MatiSathi Deterministic Tools
 * Each tool call returns structured output and can be logged to DecisionTraceStep
 */

import { CLASS_9_CURRICULUM, INITIAL_MASTERY_STATE } from './curriculum-kb';
import type {
  CurriculumCapsule,
  ConceptMastery,
  PedagogicalStrategy,
  ProactiveNudge,
  SubjectId,
} from './types';

export interface SearchCurriculumResult {
  found: boolean;
  matchedCapsule: CurriculumCapsule;
  confidence: number;
  matchedTerms: string[];
}

/**
 * Tool: searchCurriculumKB
 * Deterministically searches Class 9 Odisha syllabus for student query
 */
export function searchCurriculumKB(
  query: string,
  preferredSubject?: SubjectId,
): SearchCurriculumResult {
  const clean = query.toLowerCase();

  // Scoring capsules based on Odia script, English terms, and keywords
  let bestCapsule: CurriculumCapsule = CLASS_9_CURRICULUM[0];
  let maxScore = -1;
  const matchedTerms: string[] = [];

  for (const capsule of CLASS_9_CURRICULUM) {
    let score = 0;

    // Check title keywords
    if (clean.includes(capsule.topicNameEnglish.toLowerCase())) score += 8;
    if (clean.includes(capsule.topicNameOdia)) score += 8;

    // Check specific terms
    for (const term of capsule.keyTerms) {
      if (clean.includes(term.english.toLowerCase())) {
        score += 4;
        matchedTerms.push(term.english);
      }
      if (clean.includes(term.odia)) {
        score += 4;
        matchedTerms.push(term.odia);
      }
    }

    // Keyword heuristics for pre-seeded Class 9 curriculum (require multi-word or precise terms)
    if (capsule.id === 'sci-cell-biology') {
      if (/\b(cell wall|cell membrane|mitochondria|cytoplasm)\b|ପ୍ରାଚୀର|ଝିଲ୍ଲୀ|କୋଷ/i.test(clean)) score += 8;
    } else if (capsule.id === 'sci-force-motion') {
      if (/\b(inertia|newton|laws of motion)\b|ଜଡ଼ତା|ନ୍ୟୁଟନ/i.test(clean) || (/\bforce\b/i.test(clean) && /\bmotion\b/i.test(clean) && !/\bmotor|electric|aeroplane|airplane\b/i.test(clean))) score += 8;
    } else if (capsule.id === 'sci-matter-evaporation') {
      if (/\b(evaporation|earthen pot|cooling by evaporation)\b|ବାଷ୍ପୀଭବନ|କଳସୀ/i.test(clean)) score += 8;
    } else if (capsule.id === 'geo-odisha-rivers') {
      if (/\b(mahanadi|hirakud|chilika)\b|ମହାନଦୀ|ହୀରାକୁଦ|ଚିଲିକା/i.test(clean)) score += 8;
    } else if (capsule.id === 'geo-odisha-climate') {
      if (/\b(monsoon|kalbaisakhi)\b|ମୌସୁମୀ|କାଳବୈଶାଖୀ/i.test(clean)) score += 8;
    }

    // Only boost subject if there is already a strong topical match
    if (score >= 6 && preferredSubject && capsule.subject === preferredSubject) {
      score += 1;
    }

    if (score > maxScore) {
      maxScore = score;
      bestCapsule = capsule;
    }
  }

  // If no curated capsule had high match score (>= 6), construct dynamic universal capsule for this user doubt
  if (maxScore < 6) {
    const slug =
      clean
        .replace(/[^a-z0-9\s]/gi, '')
        .trim()
        .split(/\s+/)
        .slice(0, 4)
        .join('-')
        .toLowerCase() || 'general-topic';

    const hasOdia = /[\u0B00-\u0B7F]/.test(query);
    const cleanedTopic = query.replace(/[?।!.,;:()\[\]"']/g, '').trim();

    bestCapsule = {
      id: `dyn-${slug}`,
      subject: preferredSubject || 'Universal Knowledge',
      chapterOdia: 'ନିର୍ଦ୍ଦିଷ୍ଟ ପାଠ୍ୟ ବିଷୟ',
      chapterEnglish: 'Topic-Specific Inquiry',
      topicNameOdia: hasOdia ? cleanedTopic.slice(0, 40) : `ବିଷୟ: ${cleanedTopic.slice(0, 35)}`,
      topicNameEnglish: cleanedTopic.slice(0, 40) || 'Custom Topic',
      summaryOdia: `"${cleanedTopic.slice(0, 40)}" ବିଷୟରେ ମୌଳିକ ନିୟମ ଓ ସ୍ପଷ୍ଟୀକରଣ |`,
      keyTerms: [
        { odia: 'ମୁଖ୍ୟ ଧାରଣା', english: 'Core Concept', explanationOdia: 'ବିଷୟର ପ୍ରାଥମିକ ନିୟମ' },
        { odia: 'ପ୍ରୟୋଗ', english: 'Practical Application', explanationOdia: 'ଦୈନନ୍ଦିନ ବ୍ୟବହାର' },
      ],
      ruralAnalogy: {
        metaphorTitleOdia: 'ଦୈନନ୍ଦିନ ବାସ୍ତବ ଉଦାହରଣ',
        metaphorTitleEnglish: 'Everyday Practical Analogy',
        explanationOdia: 'ଏହି ନିୟମ ଆମ ଚତୁର୍ପାର୍ଶ୍ୱରେ ଘଟୁଥିବା ବାସ୍ତବ ଘଟଣା ସହ ସମାନ |',
        explanationEnglish: 'This principle mirrors phenomena observed in everyday life.',
        localAnchor: 'ଦୈନନ୍ଦିନ ପ୍ରୟୋଗ (Real-world Application)',
      },
      commonMisconceptions: [
        {
          confusionOdia: 'ସାଧାରଣ ଧାରଣାଗତ ଭ୍ରମ',
          confusionEnglish: 'Common Conceptual Confusion',
          clarificationOdia: 'ସଠିକ୍ କାରଣ ଓ ପରିଣାମ ବୁଝିବା ଆବଶ୍ୟକ |',
          clarificationEnglish: 'Clarify cause and effect relationships.',
          keywords: ['confusion', 'mistake', 'ଭୁଲ'],
        },
      ],
      examFocusPoints: ['Core Definition & Principle', 'Practical Real-world Application'],
    };

    return {
      found: true,
      matchedCapsule: bestCapsule,
      confidence: 0.90,
      matchedTerms: Array.from(new Set(matchedTerms)),
    };
  }

  return {
    found: true,
    matchedCapsule: bestCapsule,
    confidence: Math.min(1, Math.max(0.6, maxScore / 12)),
    matchedTerms: Array.from(new Set(matchedTerms)),
  };
}

export interface DiagnosticResult {
  hasMisconception: boolean;
  misconceptionId?: string;
  misconceptionDescriptionOdia?: string;
  misconceptionDescriptionEnglish?: string;
  severity: 'low' | 'medium' | 'high';
  correctionGuidanceOdia?: string;
}

/**
 * Tool: recordDiagnosticFinding
 * Evaluates whether student query or explanation reflects an entrenched misconception
 */
export function recordDiagnosticFinding(
  capsule: CurriculumCapsule,
  query: string,
): DiagnosticResult {
  const clean = query.toLowerCase();

  for (const rule of capsule.commonMisconceptions) {
    const hits = rule.keywords.filter((kw) => clean.includes(kw.toLowerCase()));
    if (hits.length > 0) {
      return {
        hasMisconception: true,
        misconceptionDescriptionOdia: rule.confusionOdia,
        misconceptionDescriptionEnglish: rule.confusionEnglish,
        severity: 'medium',
        correctionGuidanceOdia: rule.clarificationOdia,
      };
    }
  }

  return {
    hasMisconception: false,
    severity: 'low',
  };
}

export interface MasteryUpdateResult {
  conceptId: string;
  previousScore: number;
  newScore: number;
  delta: number;
  status: ConceptMastery['status'];
}

/**
 * Tool: updateMasteryMatrix
 * Deterministically updates student's mastery score based on interaction
 */
export function updateMasteryMatrix(
  masteryState: Record<string, ConceptMastery>,
  conceptId: string,
  hasMisconception: boolean,
  isRemedialFollowup: boolean,
): MasteryUpdateResult {
  const current = masteryState[conceptId] ?? {
    conceptId,
    subject: 'Science',
    chapter: 'General',
    topicNameOdia: 'ବିଷୟ',
    topicNameEnglish: 'Topic',
    masteryScore: 40,
    totalDoubtsAsked: 0,
    lastStudiedAt: new Date().toISOString(),
    activeMisconceptions: [],
    status: 'in_progress',
  };

  const prev = current.masteryScore;
  let delta = 8; // base learning progression increment

  if (hasMisconception) {
    delta = 4; // minor progress since misconception needs resolving
  } else if (isRemedialFollowup) {
    delta = 12; // strong jump on resolving previous gap
  }

  const newScore = Math.min(100, Math.max(0, prev + delta));
  let status: ConceptMastery['status'] = 'in_progress';
  if (newScore >= 75) status = 'mastered';
  else if (newScore < 45 || hasMisconception) status = 'needs_remedial';

  return {
    conceptId,
    previousScore: prev,
    newScore,
    delta,
    status,
  };
}

/**
 * Tool: selectPedagogicalStrategy
 * Deterministic router deciding how to teach this student based on rural Odisha cognitive profile
 */
export function selectPedagogicalStrategy(
  hasMisconception: boolean,
  currentScore: number,
  eveningMinutesLeft: number,
): PedagogicalStrategy {
  if (hasMisconception) {
    return 'rural_analogy'; // Always anchor misconceptions in tangible rural metaphors first
  }
  if (currentScore < 40) {
    return 'rural_analogy';
  }
  if (eveningMinutesLeft < 15) {
    return 'retention_quiz'; // Quick 1-minute riddle if evening phone window is nearly up
  }
  if (currentScore >= 75) {
    return 'advance_concept';
  }
  return 'step_by_step_definition';
}

/**
 * Tool: scheduleProactiveNudge
 * Schedules an unprompted check-in challenge for the student's next evening phone window
 */
export function scheduleProactiveNudge(
  conceptId: string,
  capsule: CurriculumCapsule,
  hasMisconception: boolean,
): ProactiveNudge {
  if (conceptId === 'sci-cell-biology') {
    return {
      id: `nudge-${Date.now()}`,
      conceptId: capsule.id,
      topicNameOdia: capsule.topicNameOdia,
      topicNameEnglish: capsule.topicNameEnglish,
      nudgePromptOdia:
        'ନମସ୍କାର! ତୁମେ Plant Cell Wall ଏବଂ Cell Membrane ମଧ୍ୟରେ ଥିବା ପାର୍ଥକ୍ୟ ବିଷୟରେ ପଚାରିଥିଲ | ଆଜି ଏକ ଛୋଟ ପ୍ରଶ୍ନର ଉତ୍ତର ଦେଇ ଏହାକୁ ପରୀକ୍ଷା କରିବା କି?',
      nudgePromptEnglish:
        'Namaskar! You asked about Plant Cell Wall vs Cell Membrane. Shall we test it with a quick riddle?',
      challengeQuestionOdia:
        'କହିଲ ଦେଖି, ଗାଁ କାନ୍ଥ ପରି କେବଳ ଉଦ୍ଭିଦ କୋଷରେ ଥିବା ଦୃଢ଼ ଆବରଣର ନାମ କ’ଣ - Cell Wall ନା Cell Membrane?',
      challengeQuestionEnglish:
        'Which rigid boundary exists ONLY in plant cells like a protective mud perimeter wall - Cell Wall or Cell Membrane?',
      suggestedAnswerKeywords: ['Cell Wall', 'କୋଷ ପ୍ରାଚୀର'],
      triggeredReason: 'Yesterday struggle with plant vs animal cell boundaries',
    };
  }

  if (conceptId === 'geo-odisha-rivers') {
    return {
      id: `nudge-${Date.now()}`,
      conceptId: capsule.id,
      topicNameOdia: capsule.topicNameOdia,
      topicNameEnglish: capsule.topicNameEnglish,
      nudgePromptOdia:
        'ନମସ୍କାର! ଆଜିର ସନ୍ଧ୍ୟା ପାଠପଢ଼ା ସମୟ ଆରମ୍ଭ ହେଲା | ମହାନଦୀ ନଦୀ ପ୍ରଣାଳୀ ଉପରେ ଏକ ଝଟପଟ ପ୍ରଶ୍ନ:',
      nudgePromptEnglish:
        'Namaskar! Your study session has begun. A quick check on the Mahanadi river basin:',
      challengeQuestionOdia:
        'ହୀରାକୁଦ ବନ୍ଧ (Hirakud Dam) କେଉଁ ନଦୀ ଉପରେ ନିର୍ମିତ ଏବଂ ଏହା କେଉଁ ଜିଲ୍ଲାରେ ଅବସ୍ଥିତ?',
      challengeQuestionEnglish:
        'On which river is the Hirakud Dam built and in which district of Odisha is it located?',
      suggestedAnswerKeywords: ['Mahanadi', 'Sambalpur', 'ମହାନଦୀ', 'ସମ୍ବଲପୁର'],
      triggeredReason: 'Spaced repetition check on Class 9 Geography river systems',
    };
  }

  return {
    id: `nudge-${Date.now()}`,
    conceptId: capsule.id,
    topicNameOdia: capsule.topicNameOdia,
    topicNameEnglish: capsule.topicNameEnglish,
    nudgePromptOdia: `ନମସ୍କାର! ଆଜିର ସନ୍ଧ୍ୟା ଅଧ୍ୟୟନ ସମୟରେ ଚାଲ "${capsule.topicNameOdia}" ଉପରେ ଏକ ଛୋଟ ପ୍ରଶ୍ନ ଅଭ୍ୟାସ କରିବା |`,
    nudgePromptEnglish: `Namaskar! In today's study window, let's practice a short challenge on "${capsule.topicNameEnglish}".`,
    challengeQuestionOdia: `${capsule.topicNameOdia} ବିଷୟରେ ମୁଖ୍ୟ ବାସ୍ତବ ନିୟମ ବା ଉଦାହରଣ କ’ଣ?`,
    challengeQuestionEnglish: `What is the key principle or practical application of ${capsule.topicNameEnglish}?`,
    suggestedAnswerKeywords: capsule.keyTerms.map((t) => t.english),
    triggeredReason: hasMisconception
      ? `Targeted spaced follow-up to resolve initial conceptual misconception in ${capsule.topicNameEnglish}`
      : `Scheduled spaced review check for ${capsule.topicNameEnglish}`,
  };
}
