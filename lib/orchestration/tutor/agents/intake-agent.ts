/**
 * Agent 1: Intake Agent
 * Normalizes text or voice transcript, detects language (or-IN, en, hi),
 * rejects empty or unsafe input, and prepares the normalized doubt.
 */

import type { DecisionTraceEvent } from '@/lib/server/learner/types';
import type { TutorStateType } from '../state';
import { getLocalizedStrings, normalizeLanguageCode } from '../language-prompts';

export interface IntakeAgentOutput {
  normalizedText: string;
  detectedLanguage: string;
  isSafe: boolean;
  rejectReason?: string;
  rejectionMessage?: string;
  trace: DecisionTraceEvent;
}

export async function runIntakeAgent(state: TutorStateType): Promise<Partial<TutorStateType>> {
  const t0 = Date.now();
  const raw = state.currentDoubt.rawInput?.trim() || '';
  const langCode = normalizeLanguageCode(state.language);
  const localized = getLocalizedStrings(langCode);

  // 1. Check for empty input
  if (!raw) {
    const trace: DecisionTraceEvent = {
      learnerId: state.learnerId,
      turnId: state.turnId,
      agent: 'intake',
      node: 'intake',
      tool: 'validateInput',
      input: { rawInput: '' },
      output: { isSafe: false, rejectReason: 'EMPTY_INPUT' },
      inputSummary: 'Empty student input',
      outputSummary: 'Rejected: empty query',
      reason: 'Learner submitted an empty input string',
      ms: Date.now() - t0,
      latencyMs: Date.now() - t0,
      status: 'rejected',
      fallbackUsed: false,
    };

    return {
      currentDoubt: {
        rawInput: '',
        inputMode: state.currentDoubt.inputMode || 'text',
        normalizedText: '',
        detectedLanguage: langCode,
        isSafe: false,
        rejectReason: 'EMPTY_INPUT',
        rejectionMessage: localized.clarifyingQuestionPrompt,
      },
      traces: [trace],
      nextAgent: 'END',
      finalAnswer: localized.clarifyingQuestionPrompt,
    };
  }

  // 2. Language Detection heuristic
  const hasOdiaScript = /[\u0B00-\u0B7F]/.test(raw);
  const hasDevanagari = /[\u0900-\u097F]/.test(raw);
  const hasEnglish = /[a-zA-Z]/.test(raw);

  let detectedLanguage = state.language || 'or-IN';
  if (hasOdiaScript) {
    detectedLanguage = 'or-IN';
  } else if (hasDevanagari) {
    detectedLanguage = 'hi';
  } else if (hasEnglish && !hasOdiaScript && !hasDevanagari) {
    detectedLanguage = 'en';
  }

  // 3. Unsafe / Injection / Out-of-bounds check
  const unsafePatterns = [
    /\b(ignore previous|system prompt|jailbreak|bypass|dan mode|hack|sql injection|drop table)\b/i,
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  ];

  const isUnsafe = unsafePatterns.some((pattern) => pattern.test(raw));
  if (isUnsafe) {
    const trace: DecisionTraceEvent = {
      learnerId: state.learnerId,
      turnId: state.turnId,
      agent: 'intake',
      node: 'intake',
      tool: 'safetyGuard',
      input: { rawInput: raw.slice(0, 100) },
      output: { isSafe: false, rejectReason: 'UNSAFE_PROMPT' },
      inputSummary: `Query: ${raw.slice(0, 60)}...`,
      outputSummary: 'Rejected: potentially unsafe or injection query',
      reason: 'Input violated safety guardrails',
      ms: Date.now() - t0,
      latencyMs: Date.now() - t0,
      status: 'rejected',
      fallbackUsed: false,
    };

    return {
      currentDoubt: {
        rawInput: raw,
        inputMode: state.currentDoubt.inputMode || 'text',
        normalizedText: raw,
        detectedLanguage,
        isSafe: false,
        rejectReason: 'UNSAFE_PROMPT',
        rejectionMessage: localized.unsafeInputRejected,
      },
      traces: [trace],
      nextAgent: 'END',
      finalAnswer: localized.unsafeInputRejected,
    };
  }

  // 4. Input normalization (trim whitespace, collapse repeated punctuation, preserve technical brackets)
  const normalizedText = raw.replace(/\s+/g, ' ').trim();

  const trace: DecisionTraceEvent = {
    learnerId: state.learnerId,
    turnId: state.turnId,
    agent: 'intake',
    node: 'intake',
    tool: 'normalizeInput',
    input: { rawInput: raw.slice(0, 100), inputMode: state.currentDoubt.inputMode },
    output: { normalizedText: normalizedText.slice(0, 100), detectedLanguage, isSafe: true },
    inputSummary: `Input: ${normalizedText.slice(0, 60)}`,
    outputSummary: `Language: ${detectedLanguage}, Safe: true`,
    reason: 'Input successfully validated, sanitized, and language detected',
    ms: Date.now() - t0,
    latencyMs: Date.now() - t0,
    status: 'success',
    fallbackUsed: false,
  };

  return {
    language: detectedLanguage,
    currentDoubt: {
      rawInput: raw,
      inputMode: state.currentDoubt.inputMode || 'text',
      normalizedText,
      detectedLanguage,
      isSafe: true,
    },
    traces: [trace],
    nextAgent: 'concept_mapper',
  };
}
