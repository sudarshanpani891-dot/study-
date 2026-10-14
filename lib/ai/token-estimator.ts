/**
 * Token Estimation per Request using js-tiktoken
 * Provides accurate token estimation for OpenAI/Groq compatible chat & completion calls.
 */

import { getEncoding, type Tiktoken } from 'js-tiktoken';
import type { generateText, streamText } from 'ai';

type GenerateTextParams = Parameters<typeof generateText>[0];
type StreamTextParams = Parameters<typeof streamText>[0];

let cachedEncoder: Tiktoken | null = null;

function getEncoder(): Tiktoken | null {
  if (cachedEncoder) return cachedEncoder;
  try {
    cachedEncoder = getEncoding('cl100k_base');
    return cachedEncoder;
  } catch (err) {
    console.warn('[TokenEstimator] Failed to initialize cl100k_base encoder:', err);
    return null;
  }
}

/**
 * Estimate token count for a raw string.
 * Uses cl100k_base encoding with fallback to character heuristic (~3.8 chars/token).
 */
export function estimateTokens(text: string | null | undefined): number {
  if (!text) return 0;
  const encoder = getEncoder();
  if (encoder) {
    try {
      return encoder.encode(text).length;
    } catch {
      // ignore and use fallback
    }
  }
  return Math.ceil(text.length / 3.8);
}

export interface RequestTokenEstimate {
  inputTokens: number;
  outputBudget: number;
  totalEstimatedTokens: number;
}

/**
 * Estimate total tokens for a generateText or streamText request.
 * Encodes system prompt, user prompt, messages, tools, and output budget reserve.
 */
export function estimateRequestTokens(
  params: GenerateTextParams | StreamTextParams,
  defaultOutputReserve = 1200,
): RequestTokenEstimate {
  let inputTokens = 0;

  const p = params as Record<string, unknown>;

  // 1. System prompt
  if (typeof p.system === 'string') {
    inputTokens += estimateTokens(p.system) + 4; // message framing overhead
  }

  // 2. Simple prompt
  if (typeof p.prompt === 'string') {
    inputTokens += estimateTokens(p.prompt) + 4;
  }

  // 3. Multi-turn messages
  if (Array.isArray(p.messages)) {
    for (const msg of p.messages) {
      inputTokens += 4; // role + delimiter overhead
      if (typeof msg === 'string') {
        inputTokens += estimateTokens(msg);
      } else if (msg && typeof msg === 'object') {
        const content = (msg as { content?: unknown }).content;
        if (typeof content === 'string') {
          inputTokens += estimateTokens(content);
        } else if (Array.isArray(content)) {
          for (const part of content) {
            if (part && typeof part === 'object') {
              if (part.type === 'text' && typeof part.text === 'string') {
                inputTokens += estimateTokens(part.text);
              } else if (part.type === 'image') {
                // High-res or low-res image token allowance
                inputTokens += 350;
              }
            }
          }
        }
      }
    }
  }

  // 4. Tools definitions overhead
  if (p.tools && typeof p.tools === 'object') {
    try {
      inputTokens += estimateTokens(JSON.stringify(p.tools)) + 16;
    } catch {
      inputTokens += 150;
    }
  }

  // 5. Output Budget
  const outputBudget =
    typeof p.maxOutputTokens === 'number' && p.maxOutputTokens > 0
      ? p.maxOutputTokens
      : defaultOutputReserve;

  return {
    inputTokens,
    outputBudget,
    totalEstimatedTokens: inputTokens + outputBudget,
  };
}
