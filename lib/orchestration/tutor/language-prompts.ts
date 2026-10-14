/**
 * MatiSathi Language Directives & Localization Engine
 * Supports Odia (or-IN), English (en), and Hindi (hi) with extensibility.
 * Enforces Class 9 readability and bracketed English technical terms.
 */

export type SupportedLanguage = 'or-IN' | 'en' | 'hi';

export function normalizeLanguageCode(lang?: string | null): SupportedLanguage {
  if (!lang) return 'or-IN';
  const clean = lang.trim().toLowerCase();
  if (clean.startsWith('or') || clean.includes('odia') || clean.includes('oriya')) return 'or-IN';
  if (clean.startsWith('hi') || clean.includes('hindi')) return 'hi';
  if (clean.startsWith('en') || clean.includes('english')) return 'en';
  return 'or-IN';
}

/**
 * Returns the standardized language instruction block to inject into every agent prompt.
 */
export function getAgentLanguageDirective(language: string): string {
  const code = normalizeLanguageCode(language);

  switch (code) {
    case 'or-IN':
      return `LANGUAGE DIRECTIVE (CRITICAL - ODIA):
- Target Audience: Class 9 rural/semi-urban student in Odisha.
- Script: Write purely in Odia script (ଓଡ଼ିଆ).
- Tone & Register: Warm, encouraging, elder brother/sister (ସାଥୀ / ବଡ଼ଭାଇ) voice. Use simple spoken Odia.
- Technical Terms Rule: Write the term in Odia, followed by the English term in brackets ONCE when first introduced. Example: 'କୋଷ ପ୍ରାଚୀର (Cell Wall)', 'ବଳ (Force)', 'ଜଡ଼ତା (Inertia)'. Do NOT mix raw English sentences into the text.
- Grounding: Use familiar Odisha rural/village analogies (ଚାଷ ଜମି, ମାଟି କଳସୀ, ଧାନ ଫସଲ, କୂଅ, ସାଇକେଲ, ମନ୍ଦିର).`;

    case 'hi':
      return `LANGUAGE DIRECTIVE (CRITICAL - HINDI):
- Target Audience: Class 9 student in India.
- Script: Write purely in Devanagari script (हिन्दी).
- Tone & Register: Warm, supportive, encouraging peer/tutor tone. Use clear, accessible Hindi.
- Technical Terms Rule: Write the term in Hindi, followed by the English term in brackets ONCE when first introduced. Example: 'कोशिका भित्ति (Cell Wall)', 'बल (Force)'. Do NOT mix raw English sentences into the text.
- Grounding: Use practical, relatable Indian everyday life examples (मिट्टी का घड़ा, खेत, साइकिल, पानी का पंप).`;

    case 'en':
    default:
      return `LANGUAGE DIRECTIVE (ENGLISH):
- Target Audience: Class 9 student.
- Register: Simple, clear, encouraging conversational English suitable for a 14-year-old.
- Technical Terms: Bold core technical terms when first introduced, followed by an intuitive definition.
- Grounding: Use relatable real-world physical and community examples.`;
  }
}

export interface LocalizedStringDictionary {
  welcome: string;
  clarifyingQuestionPrompt: string;
  unsafeInputRejected: string;
  prerequisiteReason: (prereqName: string, score: number) => string;
  masteredReason: (conceptName: string, score: number) => string;
  practiceReason: (conceptName: string) => string;
  explainReason: (conceptName: string) => string;
  reviseReason: (conceptName: string) => string;
  todayPlanTitle: string;
  weekPlanTitle: string;
  whyThisTooltip: string;
  streakFollowupHook: string;
  recheckFollowupHook: (conceptName: string) => string;
  practiceSubmitSuccess: string;
}

export const LOCALIZED_STRINGS: Record<SupportedLanguage, LocalizedStringDictionary> = {
  'or-IN': {
    welcome: 'ନମସ୍କାର! ମୁଁ ତୁମର ମାଟି ସାଥୀ | ଆଜି ତୁମେ କ’ଣ ଶିଖିବାକୁ ଚାହୁଁଛ?',
    clarifyingQuestionPrompt: 'ତୁମ ପ୍ରଶ୍ନଟି ଟିକେ ସ୍ପଷ୍ଟ କରିବ କି? ତୁମେ ନିର୍ଦ୍ଦିଷ୍ଟ ଭାବେ କେଉଁ ବିଷୟରେ ପଚାରୁଛ?',
    unsafeInputRejected: 'ଏହି ପ୍ରଶ୍ନଟି ଆମ ଶିକ୍ଷଣ ପାଠ୍ୟକ୍ରମ ସହ ସମ୍ପର୍କିତ ନୁହେଁ | ଦୟାକରି ବିଜ୍ଞାନ, ଗଣିତ କିମ୍ବା ପାଠପଢ଼ା ସମ୍ବନ୍ଧୀୟ ପ୍ରଶ୍ନ ପଚାରନ୍ତୁ |',
    prerequisiteReason: (name, score) =>
      `ତୁମେ ${name} ରେ ଅସୁବିଧା ଅନୁଭବ କରୁଥିଲ (ଦକ୍ଷତା ${Math.round(score * 100)}%), ତେଣୁ ମୂଳଦୁଆ ମଜବୁତ କରିବା ପାଇଁ ଆଜି ଏହା ପୁଣି ପଢ |`,
    masteredReason: (name, score) =>
      `ତୁମେ ${name} ରେ ଉତ୍କୃଷ୍ଟ ଦକ୍ଷତା ହାସଲ କରିଛ (${Math.round(score * 100)}%) | ପରବର୍ତ୍ତୀ ବିଷୟକୁ ଅଗ୍ରସର ହୁଅ |`,
    practiceReason: (name) =>
      `ତୁମର ଧାରଣା ମନେରଖିବା ପାଇଁ ${name} ର କିଛି ପ୍ରଶ୍ନ ଅଭ୍ୟାସ କର |`,
    explainReason: (name) =>
      `${name} କୁ ସରଳ ଗ୍ରାମୀଣ ଉଦାହରଣ ସହିତ ବୁଝିବା |`,
    reviseReason: (name) =>
      `ସ୍ମରଣ ଶକ୍ତି ବୃଦ୍ଧି ପାଇଁ ଆଜି ${name} ର ପୁନରାବୃତ୍ତି (Revision) କରନ୍ତୁ |`,
    todayPlanTitle: 'ଆଜିର ଶିକ୍ଷଣ ଯୋଜନା (Today’s Plan)',
    weekPlanTitle: 'ସାପ୍ତାହିକ ଯୋଜନା (Week View)',
    whyThisTooltip: 'ଏହି ବିଷୟ କାହିଁକି ଆବଣ୍ଟିତ ହୋଇଛି?',
    streakFollowupHook: 'ଆଜି ପଢ଼ିବା ପାଇଁ ତୁମର ସମୟ ହୋଇଛି! ଚାଲ କିଛି ନୂଆ ଶିଖିବା |',
    recheckFollowupHook: (name) =>
      `ଗତକାଲି ଆମେ ${name} ବିଷୟରେ ପଢ଼ିଥିଲେ | ଦେଖିବା ତୁମର କେତେ ମନେଅଛି!`,
    practiceSubmitSuccess: 'ତୁମର ଉତ୍ତର ସଫଳତାର ସହ ଯାଞ୍ଚ ହୋଇଛି |',
  },
  'hi': {
    welcome: 'नमस्ते! मैं तुम्हारा माटी साथी हूँ। आज तुम क्या सीखना चाहते हो?',
    clarifyingQuestionPrompt: 'क्या आप अपने सवाल को थोड़ा और स्पष्ट कर सकते हैं? आप किस विषय के बारे में पूछ रहे हैं?',
    unsafeInputRejected: 'यह सवाल हमारे अध्ययन पाठ्यक्रम से संबंधित नहीं है। कृपया विज्ञान या गणित से जुड़ा सवाल पूछें।',
    prerequisiteReason: (name, score) =>
      `आपने ${name} में गलती की थी (दक्षता ${Math.round(score * 100)}%), इसलिए नींव मजबूत करने के लिए इसे आज फिर से पढ़ें।`,
    masteredReason: (name, score) =>
      `आपने ${name} में महारत हासिल कर ली है (${Math.round(score * 100)}%)। अगले पाठ की ओर बढ़ें।`,
    practiceReason: (name) =>
      `अपनी समझ को परखने के लिए ${name} के कुछ प्रश्नों का अभ्यास करें।`,
    explainReason: (name) =>
      `${name} को सरल उदाहरणों के साथ समझें।`,
    reviseReason: (name) =>
      `याददाश्त पक्की करने के लिए आज ${name} का दोहराव (Revision) करें।`,
    todayPlanTitle: 'आज की अध्ययन योजना (Today’s Plan)',
    weekPlanTitle: 'साप्ताहिक योजना (Week View)',
    whyThisTooltip: 'यह विषय क्यों चुना गया?',
    streakFollowupHook: 'आज के अध्ययन का समय हो गया है! आइए कुछ नया सीखते हैं।',
    recheckFollowupHook: (name) =>
      `कल हमने ${name} पढ़ा था। देखते हैं आपको कितना याद है!`,
    practiceSubmitSuccess: 'आपके उत्तर का सफलतापूर्वक मूल्यांकन कर लिया गया है।',
  },
  'en': {
    welcome: 'Hello! I am MatiSathi, your personal learning partner. What would you like to explore today?',
    clarifyingQuestionPrompt: 'Could you please clarify your doubt? Which specific concept are you asking about?',
    unsafeInputRejected: 'This input is not related to our curriculum or learning goals. Please ask a science or math question.',
    prerequisiteReason: (name, score) =>
      `You had some confusion in ${name} (mastery ${Math.round(score * 100)}%), so rebuild your foundation by reviewing it today.`,
    masteredReason: (name, score) =>
      `You have mastered ${name} (${Math.round(score * 100)}%). Ready to advance to the next concept.`,
    practiceReason: (name) =>
      `Reinforce your understanding with active practice on ${name}.`,
    explainReason: (name) =>
      `Let’s break down ${name} with intuitive real-world examples.`,
    reviseReason: (name) =>
      `Spaced repetition review for ${name} to cement long-term recall.`,
    todayPlanTitle: 'Today’s Study Plan',
    weekPlanTitle: 'Weekly Learning Schedule',
    whyThisTooltip: 'Why was this recommended?',
    streakFollowupHook: 'Time for today’s learning session! Ready to dive in?',
    recheckFollowupHook: (name) =>
      `We covered ${name} recently. Let’s do a quick 2-minute knowledge check!`,
    practiceSubmitSuccess: 'Practice submitted and evaluated successfully.',
  },
};

export function getLocalizedStrings(lang?: string | null): LocalizedStringDictionary {
  return LOCALIZED_STRINGS[normalizeLanguageCode(lang)];
}
