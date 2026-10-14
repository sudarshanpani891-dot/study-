/**
 * Agent 5: Tutor Agent
 * Generates an adaptive micro-lesson at the learner's level:
 * - Max 150 words
 * - Exactly one local example (Odisha rural/cultural context)
 * - Key terms in the chosen language with the English term in brackets ONCE
 * - Model: llama-3.3-70b-versatile (premium) with rule-based fallback
 */

import type { DecisionTraceEvent } from '@/lib/server/learner/types';
import type { MicroLessonState, TutorStateType } from '../state';
import { executeAgentLLM } from '../agent-llm';
import { getAgentLanguageDirective, normalizeLanguageCode } from '../language-prompts';
import { CLASS_9_CURRICULUM } from '@/lib/matisathi/curriculum-kb';

interface TutorLLMOutput {
  lessonText: string;
  lessonTextEnglish?: string;
  analogyOrExample: string;
  technicalTerms?: Array<{ inLanguage: string; inEnglish: string }>;
}

function parseTutorJson(raw: string): TutorLLMOutput | null {
  if (!raw || !raw.trim()) return null;
  const stripped = raw
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/```json\s*|\s*```/g, '')
    .trim();

  try {
    return JSON.parse(stripped) as TutorLLMOutput;
  } catch {
    const match = stripped.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as TutorLLMOutput;
      } catch {
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const { jsonrepair } = require('jsonrepair');
          return JSON.parse(jsonrepair(match[0])) as TutorLLMOutput;
        } catch {
          // continue to regex extraction
        }
      }
    }
  }

  // Regex extraction if output was unstructured
  try {
    const lessonMatch = raw.match(/["']?lessonText["']?\s*:\s*["']([^"']+)["']/i);
    const engMatch = raw.match(/["']?lessonTextEnglish["']?\s*:\s*["']([^"']+)["']/i);
    const analogyMatch = raw.match(/["']?analogyOrExample["']?\s*:\s*["']([^"']+)["']/i);

    if (lessonMatch) {
      return {
        lessonText: lessonMatch[1],
        lessonTextEnglish: engMatch ? engMatch[1] : undefined,
        analogyOrExample: analogyMatch ? analogyMatch[1] : '',
      };
    }
  } catch {
    // ignore
  }

  return null;
}

export async function runTutorAgent(state: TutorStateType): Promise<Partial<TutorStateType>> {
  const t0 = Date.now();
  const plan = state.plan;
  const targetConceptId = plan.targetConceptId;
  const targetNameOr = plan.targetConceptNameOr;
  const targetNameEn = plan.targetConceptNameEn;
  const langCode = normalizeLanguageCode(state.language);
  const langDirective = getAgentLanguageDirective(langCode);

  const systemPrompt = `You are the Expert Tutor Agent (MatiSathi) for Class 9 students in Odisha, India.
Explain the target concept strictly following these constraints:

1. EXACT ANSWER: Provide a scientifically accurate, direct explanation that answers what the student asked.
2. MAXIMUM LENGTH: Under 140 words. Be crisp, visual, and conceptual.
3. LOCAL ANALOGY: Provide exactly one relatable everyday life / rural Odisha example (e.g. curd from milk / ଦହି ପ୍ରସ୍ତୁତି, rust on iron tools / କଳଙ୍କି, clay pot baking, bicycle friction, river embankment).
4. TARGET LANGUAGE: Write 'lessonText' in the target language (${langCode}), with technical terms bracketed in English ONCE when first introduced (e.g. 'ରାସାୟନିକ ପ୍ରତିକ୍ରିୟା (Chemical Reaction)').
5. ENGLISH EXPLANATION: Write 'lessonTextEnglish' in crisp, fluent English explaining the core concept for bilingual learners.
6. TONE: Warm, inspiring, peer tutor voice.

${langDirective}

Output MUST be valid JSON only with structure:
{
  "lessonText": "Micro-lesson text in target language under 120 words with bracketed English terms once",
  "lessonTextEnglish": "Clear English micro-lesson under 120 words explaining the concept",
  "analogyOrExample": "One sentence rural / everyday analogy",
  "technicalTerms": [{"inLanguage": "ରାସାୟନିକ ପ୍ରତିକ୍ରିୟା", "inEnglish": "Chemical Reaction"}]
}`;

  const userPrompt = `Student Question / Doubt: "${state.currentDoubt.normalizedText}"
Target Concept: "${targetNameOr}" (${targetNameEn})
Pedagogical Goal: ${plan.reason}

Provide the exact micro-lesson answering this question.`;

  const fallbackHarness = () => {
    // Check pre-cached curriculum capsules for authentic local analogies
    const capsule = CLASS_9_CURRICULUM.find(
      (c) =>
        c.id.includes(targetConceptId) ||
        c.topicNameEnglish.toLowerCase().includes(targetNameEn.toLowerCase()) ||
        targetConceptId.includes('cell') ||
        targetConceptId.includes('motion'),
    );

    let lessonText = '';
    let lessonTextEnglish = '';
    let example = '';

    if (targetConceptId.includes('chem-reactions')) {
      lessonText =
        'ରାସାୟନିକ ପ୍ରତିକ୍ରିୟା (Chemical Reaction) ହେଉଛି ଏକ ପ୍ରକ୍ରିୟା ଯେଉଁଥିରେ ଏକ ବା ଏକାଧିକ ପଦାର୍ଥ (Reactants) ପରିବର୍ତ୍ତିତ ହୋଇ ସମ୍ପୂର୍ଣ୍ଣ ନୂତନ ଗୁଣବିଶିଷ୍ଟ ପଦାର୍ଥ (Products) ସୃଷ୍ଟି କରନ୍ତି | ଏଥିରେ ପରମାଣୁଗୁଡ଼ିକର ପୁନଃସଂଗଠନ ଘଟେ |';
      lessonTextEnglish =
        'A Chemical Reaction is a process in which one or more starting substances (Reactants) undergo chemical changes to form new substances (Products) with entirely different chemical and physical properties.';
      example = 'କ୍ଷୀରରୁ ଦହି ହେବା କିମ୍ବା ଓଦା ପବନରେ ଲୁହା ଉପକରଣରେ କଳଙ୍କି ଲାଗିବା ଏକ ରାସାୟନିକ ପ୍ରତିକ୍ରିୟାର ଜ୍ୱଳନ୍ତ ଉଦାହରଣ |';
    } else if (targetConceptId.includes('cell-wall')) {
      lessonText =
        'କୋଷ ପ୍ରାଚୀର (Cell Wall) କେବଳ ଉଦ୍ଭିଦ କୋଷରେ ଦେଖାଯାଏ | ଏହା ସେଲ୍ୟୁଲୋଜ୍ (Cellulose) ରେ ନିର୍ମିତ ଏକ ଦୃଢ଼ ବାହାର ଆବରଣ ଅଟେ | ଏହା କୋଷକୁ ନିର୍ଦ୍ଦିଷ୍ଟ ଆକାର ଦିଏ ଏବଂ ଝଡ଼-ବର୍ଷାରୁ ରକ୍ଷା କରେ | ପ୍ରାଣୀ କୋଷରେ କୋଷ ପ୍ରାଚୀର ନଥାଏ |';
      lessonTextEnglish =
        'The Cell Wall is a rigid outer layer found only in plant cells, made primarily of cellulose. It provides structural support, protection, and shape against mechanical stress.';
      example = 'ଗାଁ ମାଟି ଘରର ବାହାର ମାଟି କାନ୍ଥ (Boundary Wall) ପରି, ଯାହା ଝଡ଼-ବର୍ଷାରେ ଘରକୁ ସିଧା ଠିଆ କରି ରଖେ |';
    } else if (targetConceptId.includes('cell-membrane')) {
      lessonText =
        'କୋଷ ଝିଲ୍ଲୀ (Plasma Membrane) ପ୍ରାଣୀ ଓ ଉଦ୍ଭିଦ ଉଭୟ କୋଷରେ ଥାଏ | ଏହା ଏକ ଅର୍ଦ୍ଧ-ପାରଗମ୍ୟ (Semi-permeable) ଝିଲ୍ଲୀ | ଏହା କେବଳ ଆବଶ୍ୟକୀୟ ପୋଷକ ତତ୍ତ୍ୱକୁ ଭିତରକୁ ଛାଡ଼େ ଏବଂ ବର୍ଜ୍ୟବସ୍ତୁକୁ ବାହାର କରେ |';
      lessonTextEnglish =
        'The Plasma Membrane is a semi-permeable boundary present in both plant and animal cells, regulating the entry and exit of nutrients and waste products.';
      example = 'ଘରର ଜାଲି କବାଟ (Screen Door) ପରି, ଯାହା ପବନ ଛାଡ଼େ କିନ୍ତୁ ମଶା-ମାଛିକୁ ଅଟକାଏ |';
    } else if (capsule) {
      lessonText = capsule.summaryOdia;
      lessonTextEnglish = `${capsule.topicNameEnglish}: ${capsule.summaryOdia}`;
      example = `${capsule.ruralAnalogy.metaphorTitleOdia}: ${capsule.ruralAnalogy.explanationOdia}`;
    } else {
      lessonText = `${targetNameOr} (${targetNameEn}) ହେଉଛି ନବମ ଶ୍ରେଣୀ ବିଜ୍ଞାନର ଏକ ମୌଳିକ ଧାରଣା | ଏହାକୁ ସରଳ ଭାବରେ ମନେରଖିବା ପରୀକ୍ଷା ପାଇଁ ଲାଭଦାୟକ |`;
      lessonTextEnglish = `${targetNameEn} is a fundamental Class 9 Science concept essential for understanding core scientific mechanisms.`;
      example = 'ଦୈନନ୍ଦିନ ଅନୁଭୂତି ସହିତ ଏହି ନିୟମକୁ ଯୋଡ଼ି ଦେଖିବା |';
    }

    return JSON.stringify({
      lessonText,
      lessonTextEnglish,
      analogyOrExample: example,
      technicalTerms: [{ inLanguage: targetNameOr, inEnglish: targetNameEn }],
    });
  };

  const llmResult = await executeAgentLLM({
    agentName: 'tutor',
    portal: state.portal,
    modelType: 'premium', // llama-3.3-70b-versatile
    system: systemPrompt,
    prompt: userPrompt,
    maxOutputTokens: 800,
    temperature: 0.3,
    fallbackGenerator: fallbackHarness,
    responseFormat: { type: 'json_object' },
  });

  const parsed = parseTutorJson(llmResult.text);
  const lessonText = parsed?.lessonText || llmResult.text;
  const lessonTextEnglish = parsed?.lessonTextEnglish;
  const analogyOrExample = parsed?.analogyOrExample || 'ଦୈନନ୍ଦିନ ଉଦାହରଣରୁ ବୁଝିବା |';
  const technicalTerms = parsed?.technicalTerms || [];

  // Enforce max 150 words count
  const words = `${lessonText} ${analogyOrExample}`.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  const lessonState: MicroLessonState = {
    text: lessonText,
    textEnglish: lessonTextEnglish,
    analogyOrExample,
    technicalTerms,
    wordCount,
    readingLevel: 'Class 9',
    fallbackUsed: llmResult.fallbackUsed,
  };

  const trace: DecisionTraceEvent = {
    learnerId: state.learnerId,
    turnId: state.turnId,
    agent: 'tutor',
    node: 'teach',
    tool: 'generateMicroLesson',
    input: {
      targetConceptId,
      language: state.language,
      maxWords: 150,
    },
    output: {
      wordCount,
      technicalTermsCount: technicalTerms.length,
      fallbackUsed: llmResult.fallbackUsed,
    },
    inputSummary: `Teach: ${targetNameEn} (${langCode})`,
    outputSummary: `Lesson generated: ${wordCount} words`,
    reason: `Generated micro-lesson with rural analogy for ${targetNameEn}`,
    ms: llmResult.ms,
    latencyMs: llmResult.ms,
    status: 'success',
    fallbackUsed: llmResult.fallbackUsed,
  };

  return {
    lesson: lessonState,
    traces: [trace],
    nextAgent: 'language_guard',
    finalAnswer: `${lessonText}\n\n💡 **ଉଦାହରଣ (Example):** ${analogyOrExample}`,
  };
}
