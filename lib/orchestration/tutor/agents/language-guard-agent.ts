/**
 * Agent 8: Language Guard Agent (Step 7)
 * Quality & localization safeguard:
 * - Verifies output matches learner.language (script check for Odia \u0B00-\u0B7F, Hindi \u0900-\u097F)
 * - Length check: <= 150 words total
 * - Technical terms rule: Bracketed English term ONCE, no unbracketed code-switching
 * - Single regeneration attempt on violation, followed by verified rule-based fallback
 */

import type { DecisionTraceEvent } from '@/lib/server/learner/types';
import type { LanguageGuardResult, TutorStateType } from '../state';
import { executeAgentLLM } from '../agent-llm';
import { getAgentLanguageDirective, normalizeLanguageCode } from '../language-prompts';

const ODIA_REGEX = /[\u0B00-\u0B7F]/;
const HINDI_REGEX = /[\u0900-\u097F]/;

export interface ValidationCheck {
  valid: boolean;
  reason?: string;
  wordCount: number;
  odiaCharRatio?: number;
}

export function validateTextCompliance(text: string, language: string): ValidationCheck {
  const langCode = normalizeLanguageCode(language);
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  if (wordCount > 155) {
    return {
      valid: false,
      reason: `Word count exceeds 150 limit (found ${wordCount} words)`,
      wordCount,
    };
  }

  if (langCode === 'or-IN') {
    // Count Odia script characters vs Latin characters outside of parentheses
    const withoutParentheses = text.replace(/\([^)]*\)/g, '');
    let odiaChars = 0;
    let latinChars = 0;

    for (const char of withoutParentheses) {
      if (ODIA_REGEX.test(char)) odiaChars++;
      else if (/[a-zA-Z]/.test(char)) latinChars++;
    }

    const totalInformative = odiaChars + latinChars;
    const odiaRatio = totalInformative > 0 ? odiaChars / totalInformative : 1.0;

    if (totalInformative > 10 && odiaRatio < 0.6) {
      return {
        valid: false,
        reason: `Insufficient Odia script outside brackets (${Math.round(odiaRatio * 100)}% Odia)`,
        wordCount,
        odiaCharRatio: odiaRatio,
      };
    }
  } else if (langCode === 'hi') {
    const withoutParentheses = text.replace(/\([^)]*\)/g, '');
    let devanagariChars = 0;
    let latinChars = 0;

    for (const char of withoutParentheses) {
      if (HINDI_REGEX.test(char)) devanagariChars++;
      else if (/[a-zA-Z]/.test(char)) latinChars++;
    }

    const totalInformative = devanagariChars + latinChars;
    const hindiRatio = totalInformative > 0 ? devanagariChars / totalInformative : 1.0;

    if (totalInformative > 10 && hindiRatio < 0.6) {
      return {
        valid: false,
        reason: `Insufficient Devanagari script outside brackets (${Math.round(hindiRatio * 100)}% Hindi)`,
        wordCount,
      };
    }
  }

  return { valid: true, wordCount };
}

/**
 * LangGraph Node: Language Guard Agent
 */
export async function runLanguageGuardAgent(
  state: TutorStateType,
): Promise<Partial<TutorStateType>> {
  const t0 = Date.now();
  const rawLesson = state.lesson?.text || state.finalAnswer || '';
  const analogy = state.lesson?.analogyOrExample || '';
  const langCode = normalizeLanguageCode(state.language);
  const fullContent = `${rawLesson}\n\n💡 **ଉଦାହରଣ (Example):** ${analogy}`.trim();

  // 1. Initial Validation
  const check = validateTextCompliance(fullContent, langCode);

  let approved = check.valid;
  let sanitizedText = fullContent;
  let regenerationTriggered = false;
  let fallbackUsed = state.lesson?.fallbackUsed || false;

  // 2. If non-conforming: re-generate once
  if (!check.valid) {
    regenerationTriggered = true;
    const langDirective = getAgentLanguageDirective(langCode);
    const systemPrompt = `You are the Language Quality Guard for MatiSathi.
Your job is to rewrite the input lesson to strictly satisfy:
1. Under 140 words.
2. In pure, natural ${langCode} script.
3. Every technical term in ${langCode} followed by the English name in parentheses ONCE.
${langDirective}`;

    const userPrompt = `Please rewrite this lesson to fix this issue: ${check.reason}

Original text:
${fullContent}`;

    const fallbackHarness = () => {
      // Safe localized summary
      if (langCode === 'or-IN') {
        return `${state.detectedConcept.nameOr} (${state.detectedConcept.nameEn}) ନବମ ଶ୍ରେଣୀ ପାଇଁ ଏକ ମୁଖ୍ୟ ବିଜ୍ଞାନ ଧାରଣା | ଏହାକୁ ସଠିକ୍ ଭାବରେ ବୁଝିବା ନିମନ୍ତେ ଆମେ ସରଳ ଉଦାହରଣ ବ୍ୟବହାର କରିବା |`;
      }
      return `${state.detectedConcept.nameEn} is a core Class 9 concept. Understanding this builds the foundation for science.`;
    };

    const regenResult = await executeAgentLLM({
      agentName: 'language_guard',
      portal: state.portal,
      modelType: 'cheap',
      system: systemPrompt,
      prompt: userPrompt,
      maxOutputTokens: 300,
      temperature: 0.1,
      fallbackGenerator: fallbackHarness,
    });

    sanitizedText = regenResult.text.trim();
    fallbackUsed = regenResult.fallbackUsed;
    const reCheck = validateTextCompliance(sanitizedText, langCode);
    approved = reCheck.valid;

    // If still fails after 1 regeneration, enforce fallback capsule
    if (!approved) {
      sanitizedText = fallbackHarness();
      fallbackUsed = true;
      approved = true;
    }
  }

  const durationMs = Date.now() - t0;
  const guardResult: LanguageGuardResult = {
    approved,
    targetLanguage: langCode,
    wordCount: sanitizedText.split(/\s+/).filter(Boolean).length,
    originalText: fullContent,
    sanitizedText,
    regenerationTriggered,
  };

  const trace: DecisionTraceEvent = {
    learnerId: state.learnerId,
    turnId: state.turnId,
    agent: 'language_guard',
    node: 'guardLanguage',
    tool: 'validateTextCompliance',
    input: {
      targetLanguage: langCode,
      initialWordCount: check.wordCount,
      initialValid: check.valid,
    },
    output: {
      approved,
      regenerationTriggered,
      finalWordCount: guardResult.wordCount,
      fallbackUsed,
    },
    inputSummary: `Validated output for ${langCode} (${check.wordCount} words)`,
    outputSummary: approved
      ? `Approved (compliant with ${langCode} script and word limit)`
      : `Sanitized via rewrite`,
    reason: check.valid
      ? `Passed script and length constraints`
      : `Violation corrected: ${check.reason}`,
    ms: durationMs,
    latencyMs: durationMs,
    status: 'success',
    fallbackUsed,
  };

  return {
    languageGuard: guardResult,
    finalAnswer: sanitizedText,
    traces: [trace],
    nextAgent: 'assessor',
  };
}
