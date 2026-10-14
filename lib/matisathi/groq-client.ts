/**
 * MatiSathi Groq LLM Client
 * Universal Agentic EdTech Engine for learners across Odisha and India.
 * Generates autonomous diagnostic explanations, 4-stage learning plans,
 * interactive challenges, action tasks, and spaced review allocations.
 */

import type {
  CurriculumCapsule,
  PedagogicalStrategy,
  AgentLearningPlan,
  InteractiveQuizChallenge,
  HandsOnActionTask,
} from './types';

const GROQ_BASE_URL = process.env.OPENAI_BASE_URL || process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1';
const GROQ_API_KEY = process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY || '';

const DEFAULT_MODEL = 'qwen/qwen3.8-27b';
const FALLBACK_MODEL = 'openai/gpt-oss-120b';

export interface GroqCompletionParams {
  studentQuery: string;
  capsule: CurriculumCapsule;
  pedagogicalStrategy: PedagogicalStrategy;
  misconceptionAlert?: string;
  isLowDataMode?: boolean;
  internetContext?: string;
  internetSource?: string;
}

export interface GroqCompletionResult {
  explanationOdia: string;
  explanationEnglish: string;
  englishKeywords: string[];
  ruralMetaphor: string;
  prerequisites: string[];
  learningPlan: AgentLearningPlan;
  interactiveChallenge: InteractiveQuizChallenge;
  actionTask: HandsOnActionTask;
  usedTokens: number;
  durationMs: number;
  modelUsed: string;
}

function buildUniversalSystemPrompt(): string {
  return `You are MatiSathi (ମାଟି ସାଥୀ), an autonomous Goal-Pursuing Agentic EdTech Engine for learners across Odisha and India.
When a learner asks ANY doubt in ANY subject (Science, Math, History, Geography, Tech, Daily Life, Agriculture, etc.):
1. You MUST answer specifically and solely regarding the learner's query and topic. NEVER default or talk about plant cells, cell membranes, or cell walls unless the user explicitly asked about cell biology.
2. If live internet context is provided, synthesize the explanation, quiz, and learning plan directly from that factual context.
3. Provide a concise, clear Odia explanation (natural spoken Odia with English technical terms in brackets, max 100 words).
4. Provide a clear, structured English explanation (max 80 words).
5. Provide a memorable everyday or village real-life analogy relevant to THIS specific topic.
6. Formulate an autonomous 4-stage learning plan showing how the learner will master THIS specific topic.
7. Generate 1 interactive practice challenge question strictly testing THIS specific topic with 4 options (A, B, C, D) and explanations (only 1 isCorrect: true).
8. Generate 1 actionable hands-on micro-task for real-world exploration of THIS topic.
9. Schedule the next spaced review allocation and proactive follow-up question for THIS topic.

You MUST reply with a valid JSON object strictly matching this schema:
{
  "topicOdia": "<Topic name in Odia>",
  "topicEnglish": "<Topic name in English>",
  "subject": "<Science / Mathematics / Technology / Geography / Agriculture / History / etc.>",
  "prerequisites": ["<Prerequisite 1>", "<Prerequisite 2>"],
  "explanationOdia": "<Concise explanation in natural spoken Odia with English technical terms in brackets>",
  "explanationEnglish": "<Concise structured English explanation>",
  "englishKeywords": ["<Term 1>", "<Term 2>", "<Term 3>"],
  "ruralMetaphor": "<Everyday Odishan or village metaphor>",
  "misconception": "<Common mistake or trap to avoid>",
  "learningPlan": {
    "goalSummaryOdia": "<What the student will master in Odia>",
    "goalSummaryEnglish": "<What the student will master in English>",
    "stages": [
      { "stageNumber": 1, "titleOdia": "<Stage 1 Title Odia>", "titleEnglish": "Core Intuition & Analogy", "descriptionOdia": "<Brief description>", "descriptionEnglish": "<Brief description>", "status": "completed" },
      { "stageNumber": 2, "titleOdia": "<Stage 2 Title Odia>", "titleEnglish": "Technical Precision & Law", "descriptionOdia": "<Brief description>", "descriptionEnglish": "<Brief description>", "status": "in_progress" },
      { "stageNumber": 3, "titleOdia": "<Stage 3 Title Odia>", "titleEnglish": "Interactive Practice Task", "descriptionOdia": "<Brief description>", "descriptionEnglish": "<Brief description>", "status": "upcoming" },
      { "stageNumber": 4, "titleOdia": "<Stage 4 Title Odia>", "titleEnglish": "Spaced Recall Milestone", "descriptionOdia": "<Brief description>", "descriptionEnglish": "<Brief description>", "status": "upcoming" }
    ],
    "allocatedNextReview": "Tomorrow (Evening Study Window)",
    "followupChallengeOdia": "<Autonomous question for tomorrow in Odia>",
    "followupChallengeEnglish": "<Autonomous question for tomorrow in English>"
  },
  "interactiveChallenge": {
    "questionOdia": "<Single question in Odia about THIS topic>",
    "questionEnglish": "<Single question in English about THIS topic>",
    "options": [
      { "id": "A", "textOdia": "<Option A Odia>", "textEnglish": "<Option A English>", "isCorrect": true, "explanationOdia": "<Why A is correct in Odia>", "explanationEnglish": "<Why A is correct in English>" },
      { "id": "B", "textOdia": "<Option B Odia>", "textEnglish": "<Option B English>", "isCorrect": false, "explanationOdia": "<Why B is wrong in Odia>", "explanationEnglish": "<Why B is wrong in English>" },
      { "id": "C", "textOdia": "<Option C Odia>", "textEnglish": "<Option C English>", "isCorrect": false, "explanationOdia": "<Why C is wrong in Odia>", "explanationEnglish": "<Why C is wrong in English>" },
      { "id": "D", "textOdia": "<Option D Odia>", "textEnglish": "<Option D English>", "isCorrect": false, "explanationOdia": "<Why D is wrong in Odia>", "explanationEnglish": "<Why D is wrong in English>" }
    ]
  },
  "actionTask": {
    "titleOdia": "<Task Title in Odia>",
    "titleEnglish": "<Task Title in English>",
    "instructionsOdia": "<1-2 sentence real-world observation/experiment in Odia>",
    "instructionsEnglish": "<1-2 sentence observation/experiment in English>",
    "expectedOutcomeOdia": "<What they will observe in Odia>",
    "expectedOutcomeEnglish": "<What they will observe in English>"
  }
}
DO NOT wrap with code fences. Output valid raw JSON only.`;
}

export async function generatePedagogicalResponse(
  params: GroqCompletionParams,
): Promise<GroqCompletionResult> {
  const startTime = Date.now();
  const apiKey = GROQ_API_KEY.trim();

  if (!apiKey) {
    return generateCapsuleFallback(params, startTime, 'local_capsule_no_key');
  }

  const modelToUse = DEFAULT_MODEL;
  const systemPrompt = buildUniversalSystemPrompt();

  const userContent = `Learner Doubt / Question: "${params.studentQuery}"
Target Topic: ${params.capsule.topicNameEnglish} (${params.capsule.topicNameOdia})
${params.internetContext ? `Live Internet Knowledge Context (${params.internetSource || 'Wikipedia/Web'}):\n"""${params.internetContext}"""\n` : ''}
Pedagogical Strategy: ${params.pedagogicalStrategy}
${params.misconceptionAlert ? `Watch out for misconception: ${params.misconceptionAlert}` : ''}

CRITICAL: Respond ONLY regarding the question "${params.studentQuery}". Generate structured JSON:`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(`${GROQ_BASE_URL.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelToUse,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        max_tokens: 1800,
        temperature: 0.3,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.warn(`[GroqClient] API responded with ${response.status}. Using capsule fallback.`);
      return generateCapsuleFallback(params, startTime, `groq_error_${response.status}`);
    }

    const data = await response.json();
    const rawContent: string = data.choices?.[0]?.message?.content || '';
    const totalTokens = data.usage?.total_tokens ?? 350;
    const durationMs = Date.now() - startTime;

    // Resilient JSON parsing
    const cleanJson = rawContent.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    let parsed: any = null;

    try {
      parsed = JSON.parse(cleanJson);
    } catch {
      // Attempt repairing unclosed braces
      for (const suffix of ['"]}}', '"}]}}', '"}}}', '"]}', '}]}', '"}', '}']) {
        try {
          parsed = JSON.parse(cleanJson + suffix);
          break;
        } catch {}
      }
    }

    if (parsed && (parsed.explanationOdia || parsed.explanationEnglish)) {
      const learningPlan: AgentLearningPlan = {
        goalSummaryOdia: parsed.learningPlan?.goalSummaryOdia || `"${parsed.topicOdia || params.capsule.topicNameOdia}" ବିଷୟରେ ଦକ୍ଷତା ହାସଲ କରିବା |`,
        goalSummaryEnglish: parsed.learningPlan?.goalSummaryEnglish || `Master core principles and applications of ${parsed.topicEnglish || params.capsule.topicNameEnglish}.`,
        stages: Array.isArray(parsed.learningPlan?.stages) && parsed.learningPlan.stages.length >= 2
          ? parsed.learningPlan.stages
          : [
              { stageNumber: 1, titleOdia: 'ମୌଳିକ ଧାରଣା ଓ ଉଦାହରଣ', titleEnglish: 'Core Intuition & Analogy', descriptionOdia: parsed.ruralMetaphor || params.capsule.ruralAnalogy.explanationOdia, descriptionEnglish: 'Learn foundational intuition.', status: 'completed' },
              { stageNumber: 2, titleOdia: 'ବୈଜ୍ଞାନିକ ପରିଭାଷା', titleEnglish: 'Technical Precision', descriptionOdia: 'ପ୍ରମୁଖ ପରିଭାଷା ଓ ସୂତ୍ର |', descriptionEnglish: 'Key rules and scientific terms.', status: 'in_progress' },
              { stageNumber: 3, titleOdia: 'ଚ୍ୟାଲେଞ୍ଜ କୁଇଜ୍ ଓ ପ୍ରୟୋଗ', titleEnglish: 'Interactive Challenge', descriptionOdia: 'ପ୍ରଶ୍ନୋତ୍ତର ପରୀକ୍ଷା |', descriptionEnglish: 'Solve interactive exercise.', status: 'upcoming' },
              { stageNumber: 4, titleOdia: 'ସ୍ପେସ୍ଡ୍ ଫଲୋ-ଅପ୍', titleEnglish: 'Spaced Recall Review', descriptionOdia: 'ଆସନ୍ତାକାଲି ପୁନରାବୃତ୍ତି ପରୀକ୍ଷା |', descriptionEnglish: 'Spaced review tomorrow.', status: 'upcoming' },
            ],
        allocatedNextReviewDate: parsed.learningPlan?.allocatedNextReview || 'Tomorrow (Evening Study Window)',
        followupChallengePromptOdia: parsed.learningPlan?.followupChallengeOdia || `ଆସନ୍ତାକାଲି ଏହି ଧାରଣାର ପରବର୍ତ୍ତୀ ପ୍ରୟୋଗ ବିଷୟରେ ପରୀକ୍ଷା କରିବା କି?`,
        followupChallengePromptEnglish: parsed.learningPlan?.followupChallengeEnglish || `Tomorrow we will test your applied recall for this topic.`,
      };

      const interactiveChallenge: InteractiveQuizChallenge = {
        id: `quiz-${Date.now()}`,
        questionOdia: parsed.interactiveChallenge?.questionOdia || `${parsed.topicOdia || params.capsule.topicNameOdia} ବିଷୟରେ କେଉଁଟି ସଠିକ୍?`,
        questionEnglish: parsed.interactiveChallenge?.questionEnglish || `Which of the following is correct regarding ${parsed.topicEnglish || params.capsule.topicNameEnglish}?`,
        options: Array.isArray(parsed.interactiveChallenge?.options) && parsed.interactiveChallenge.options.length === 4
          ? parsed.interactiveChallenge.options
          : [
              { id: 'A', textOdia: 'ଏହା ପ୍ରକୃତି ବା ବାସ୍ତବ ପ୍ରଣାଳୀର ମୌଳିକ ନିୟମ ଅନୁସରଣ କରେ |', textEnglish: 'It follows the fundamental physical or biological principle.', isCorrect: true, explanationOdia: 'ସଠିକ୍! ଏହା ହିଁ ମୁଖ୍ୟ କାରଣ |', explanationEnglish: 'Correct! This aligns with the governing law.' },
              { id: 'B', textOdia: 'ଏହା ବିନା କୌଣସି କାରଣ ବା ଶକ୍ତିରେ ଆପେ ଆପେ ଘଟେ |', textEnglish: 'It occurs spontaneously without any energy transformation.', isCorrect: false, explanationOdia: 'ଭୁଲ; ଏହା ପାଇଁ ନିର୍ଦ୍ଦିଷ୍ଟ ଶକ୍ତି କିମ୍ବା ବଳ ଆବଶ୍ୟକ |', explanationEnglish: 'Incorrect; specific conditions and energy are required.' },
              { id: 'C', textOdia: 'ଏହାର ବାସ୍ତବ ଜୀବନ ସହ କୌଣସି ସମ୍ପର୍କ ନାହିଁ |', textEnglish: 'It has no connection to everyday observation.', isCorrect: false, explanationOdia: 'ଭୁଲ; ଦୈନନ୍ଦିନ ଜୀବନରେ ଏହାର ପ୍ରତ୍ୟକ୍ଷ ପ୍ରଭାବ ରହିଛି |', explanationEnglish: 'Incorrect; everyday phenomena directly depend on this.' },
              { id: 'D', textOdia: 'ଏହା ସର୍ବଦା ପରିବର୍ତ୍ତିତ ହୋଇ ଅପ୍ରଭାବୀ ରହେ |', textEnglish: 'It is always ineffective.', isCorrect: false, explanationOdia: 'ଭୁଲ |', explanationEnglish: 'Incorrect.' },
            ],
      };

      const actionTask: HandsOnActionTask = {
        id: `task-${Date.now()}`,
        titleOdia: parsed.actionTask?.titleOdia || `ଘରେ କିମ୍ବା ପରିବେଶରେ ପରୀକ୍ଷା (${parsed.topicOdia || params.capsule.topicNameOdia})`,
        titleEnglish: parsed.actionTask?.titleEnglish || `Hands-on Exploration (${parsed.topicEnglish || params.capsule.topicNameEnglish})`,
        instructionsOdia: parsed.actionTask?.instructionsOdia || `ଆପଣଙ୍କ ଘରେ କିମ୍ବା ଆଖପାଖରେ ଏହି ନିୟମ କିପରି କାର୍ଯ୍ୟକାରୀ ହେଉଛି ତାହା ୧ ମିନିଟ୍ ନିରୀକ୍ଷଣ କରନ୍ତୁ |`,
        instructionsEnglish: parsed.actionTask?.instructionsEnglish || `Observe how this principle works in your immediate surroundings for 1 minute.`,
        expectedOutcomeOdia: parsed.actionTask?.expectedOutcomeOdia || `ଆପଣ ଏହି ଧାରଣାର ପ୍ରତ୍ୟକ୍ଷ ପ୍ରମାଣ ନିଜ ଆଖିରେ ଦେଖିପାରିବେ |`,
        expectedOutcomeEnglish: parsed.actionTask?.expectedOutcomeEnglish || `You will observe direct evidence of this concept in real life.`,
      };

      return {
        explanationOdia: parsed.explanationOdia || params.capsule.summaryOdia,
        explanationEnglish: parsed.explanationEnglish || params.capsule.topicNameEnglish,
        englishKeywords: Array.isArray(parsed.englishKeywords) ? parsed.englishKeywords.slice(0, 5) : params.capsule.keyTerms.map((t) => t.english),
        ruralMetaphor: parsed.ruralMetaphor || params.capsule.ruralAnalogy.metaphorTitleOdia,
        prerequisites: Array.isArray(parsed.prerequisites) ? parsed.prerequisites : ['ମୌଳିକ ଧାରଣା (Core Principles)'],
        learningPlan,
        interactiveChallenge,
        actionTask,
        usedTokens: totalTokens,
        durationMs,
        modelUsed: modelToUse,
      };
    }

    // Fallback if parsing failed
    return generateCapsuleFallback(params, startTime, 'parse_fallback');
  } catch (error) {
    console.warn('[GroqClient] Request failed or timed out. Falling back to offline capsule:', error);
    return generateCapsuleFallback(params, startTime, 'offline_capsule_network_drop');
  }
}

/**
 * Curated offline fallback generated deterministically from the capsule.
 * Guarantees zero downtime even during 3G packet drop or 429 rate limit.
 */
function generateCapsuleFallback(
  params: GroqCompletionParams,
  startTime: number,
  reason: string,
): GroqCompletionResult {
  const capsule = params.capsule;
  const analogy = capsule.ruralAnalogy;
  const topicEn = capsule.topicNameEnglish;
  const topicOr = capsule.topicNameOdia;

  // Use live internet context if available
  const contextSnippet = params.internetContext ? params.internetContext.slice(0, 300) : '';

  const explanationOdia = [
    `ନମସ୍କାର! ତୁମ ପ୍ରଶ୍ନର ସରଳ ଉତ୍ତର:`,
    contextSnippet
      ? `"${topicOr}" ସମ୍ବନ୍ଧରେ ଇଣ୍ଟରନେଟ୍ ତଥ୍ୟ:\n${contextSnippet}`
      : (capsule.summaryOdia || `"${topicOr}" ବିଷୟରେ ମୌଳିକ ନିୟମ ଓ ସ୍ପଷ୍ଟୀକରଣ ଉପଲବ୍ଧ |`),
    `\n🌾 **ବାସ୍ତବ ଉଦାହରଣ (${analogy.metaphorTitleOdia}):**`,
    analogy.explanationOdia,
    params.misconceptionAlert ? `\n💡 **ମନେରଖନ୍ତୁ:** ${params.misconceptionAlert}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const learningPlan: AgentLearningPlan = {
    goalSummaryOdia: `"${topicOr}" ବିଷୟରେ ପୂର୍ଣ୍ଣ ଦକ୍ଷତା ହାସଲ କରିବା |`,
    goalSummaryEnglish: `Master core principles and applications of ${topicEn}.`,
    stages: [
      {
        stageNumber: 1,
        titleOdia: 'ପ୍ରାଥମିକ ଧାରଣା ଓ ଉଦାହରଣ',
        titleEnglish: 'Core Intuition & Analogy',
        descriptionOdia: analogy.explanationOdia,
        descriptionEnglish: analogy.explanationEnglish,
        status: 'completed',
      },
      {
        stageNumber: 2,
        titleOdia: 'ବୈଜ୍ଞାନିକ ପରିଭାଷା ଓ ନିୟମ',
        titleEnglish: 'Technical Precision & Principles',
        descriptionOdia: `ପ୍ରମୁଖ ପରିଭାଷା ଏବଂ ${topicEn} ସମ୍ବନ୍ଧିତ ବୈଜ୍ଞାନିକ ଶବ୍ଦାବଳୀର ଅନୁଶୀଳନ |`,
        descriptionEnglish: `Memorize standard definitions and technical terms for ${topicEn}.`,
        status: 'in_progress',
      },
      {
        stageNumber: 3,
        titleOdia: 'ଚ୍ୟାଲେଞ୍ଜ କୁଇଜ୍ ଓ ପ୍ରୟୋଗ',
        titleEnglish: 'Interactive Challenge & Task',
        descriptionOdia: 'ନିଜ ବୁଝାମଣା ପରୀକ୍ଷା କରିବା ପାଇଁ ଏକ ପ୍ରାକ୍ଟିକାଲ୍ ଟାସ୍କ ସମାପ୍ତ କରନ୍ତୁ |',
        descriptionEnglish: 'Solve the quick practice question and complete hands-on activity.',
        status: 'upcoming',
      },
      {
        stageNumber: 4,
        titleOdia: 'ସ୍ୱୟଂଚାଳିତ ସ୍ପେସ୍ଡ୍ ଫଲୋ-ଅପ୍',
        titleEnglish: 'Spaced Recall Review',
        descriptionOdia: `ଆସନ୍ତାକାଲି ସନ୍ଧ୍ୟା ଅଧ୍ୟୟନ ସମୟରେ ${topicOr} ର ପୁନରାବୃତ୍ତି ପରୀକ୍ଷା |`,
        descriptionEnglish: `Autonomous review scheduled for ${topicEn} in tomorrow's study window.`,
        status: 'upcoming',
      },
    ],
    allocatedNextReviewDate: 'Tomorrow @ Evening Study Window (ଆସନ୍ତାକାଲି ସନ୍ଧ୍ୟା)',
    followupChallengePromptOdia: `ଆସନ୍ତାକାଲି ${topicOr} ସମ୍ବନ୍ଧରେ ଏକ ପ୍ରୟୋଗାତ୍ମକ ପ୍ରଶ୍ନର ସମାଧାନ କରିବା କି?`,
    followupChallengePromptEnglish: `Tomorrow we will test your applied recall for ${topicEn}.`,
  };

  const interactiveChallenge: InteractiveQuizChallenge = {
    id: `quiz-${capsule.id}`,
    questionOdia: `${topicOr} (${topicEn}) ବିଷୟରେ ନିମ୍ନଲିଖିତ ମଧ୍ୟରୁ କେଉଁଟି ସଠିକ୍ ବର୍ଣ୍ଣନା?`,
    questionEnglish: `Regarding ${topicEn}, which of the following is the key governing principle or definition?`,
    options: [
      {
        id: 'A',
        textOdia: `ଏହା ${topicOr} ର ମୁଖ୍ୟ ବୈଜ୍ଞାନିକ ନିୟମ ଓ କାର୍ଯ୍ୟକାରିତାକୁ ସଠିକ୍ ଭାବେ ପରିପ୍ରକାଶ କରେ |`,
        textEnglish: `It accurately governs the primary mechanism and fundamental principle of ${topicEn}.`,
        isCorrect: true,
        explanationOdia: `ସଠିକ୍! ଏହା ହିଁ ${topicOr} ର ପ୍ରକୃତ କାରଣ ଓ ସିଦ୍ଧାନ୍ତ |`,
        explanationEnglish: `Correct! This accurately states the governing principle of ${topicEn}.`,
      },
      {
        id: 'B',
        textOdia: `ଏହା ବିନା କୌଣସି ଭୌତିକ ନିୟମ ବା କାରଣରେ ଆପେ ଆପେ ଘଟିଥାଏ |`,
        textEnglish: `It occurs spontaneously without adhering to any scientific laws or conditions.`,
        isCorrect: false,
        explanationOdia: `ଭୁଲ; ଏହା ପାଇଁ ନିର୍ଦ୍ଦିଷ୍ଟ ବୈଜ୍ଞାନିକ ସର୍ତ୍ତ ଓ ନିୟମ ଆବଶ୍ୟକ |`,
        explanationEnglish: `Incorrect; specific physical or logical conditions are strictly required.`,
      },
      {
        id: 'C',
        textOdia: `ଏହାର ବାସ୍ତବ ଜୀବନ ବା ବିଜ୍ଞାନ ସହିତ କୌଣସି ସମ୍ପର୍କ ନାହିଁ |`,
        textEnglish: `It has no practical significance or application in the real world.`,
        isCorrect: false,
        explanationOdia: `ଭୁଲ; ଦୈନନ୍ଦିନ ବିଜ୍ଞାନ ଓ ବାସ୍ତବ ଜୀବନରେ ଏହାର ପ୍ରତ୍ୟକ୍ଷ ପ୍ରଭାବ ରହିଛି |`,
        explanationEnglish: `Incorrect; real-world phenomena directly depend on this.`,
      },
      {
        id: 'D',
        textOdia: `ଉପରୋକ୍ତ କୌଣସିଟି ନୁହେଁ |`,
        textEnglish: `None of the above.`,
        isCorrect: false,
        explanationOdia: `ଭୁଲ; ବିକଳ୍ପ (A) ହିଁ ସଠିକ୍ ଉତ୍ତର |`,
        explanationEnglish: `Incorrect; option (A) is the correct answer.`,
      },
    ],
  };

  const actionTask: HandsOnActionTask = {
    id: `task-${capsule.id}`,
    titleOdia: `${topicOr} ର ବାସ୍ତବ ନିରୀକ୍ଷଣ (${topicEn})`,
    titleEnglish: `Hands-on Exploration of ${topicEn}`,
    instructionsOdia: `ନିଜ ଆଖପାଖରେ କିମ୍ବା ଦୈନନ୍ଦିନ ଜୀବନରେ ${topicOr} କିପରି କାମ କରୁଛି ତାହା ୧ ମିନିଟ୍ ନିରୀକ୍ଷଣ କରନ୍ତୁ |`,
    instructionsEnglish: `Spend 1 minute observing real-world applications or evidence of ${topicEn} in your surroundings.`,
    expectedOutcomeOdia: `ଆପଣ ପ୍ରତ୍ୟକ୍ଷ ଭାବେ ${topicOr} ର ପ୍ରମାଣ ଦେଖିପାରିବେ |`,
    expectedOutcomeEnglish: `You will see direct evidence of ${topicEn} in real life.`,
  };

  return {
    explanationOdia,
    explanationEnglish: contextSnippet ? `${topicEn}: ${contextSnippet.slice(0, 160)}` : `${topicEn}: ${analogy.explanationEnglish}`,
    englishKeywords: capsule.keyTerms.map((t) => t.english),
    ruralMetaphor: analogy.metaphorTitleOdia,
    prerequisites: ['ମୌଳିକ ଧାରଣା (Core Principles)'],
    learningPlan,
    interactiveChallenge,
    actionTask,
    usedTokens: 120,
    durationMs: Date.now() - startTime,
    modelUsed: `deterministic_offline (${reason})`,
  };
}
