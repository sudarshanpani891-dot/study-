/**
 * MatiSathi Multi-Agent LLM Invocation Engine
 * Adheres to Groq 8,000 TPM rate limits & 5,000 token request budget.
 * Handles serial execution, js-tiktoken estimation, 429/413 backoff, and fallback resolution.
 */

import fs from 'node:fs';
import path from 'node:path';
import { generateText } from 'ai';
import { callLLM } from '@/lib/ai/llm';
import { resolveModel } from '@/lib/server/resolve-model';
import { estimateTokens, estimateRequestTokens } from '@/lib/ai/token-estimator';
import { isGroqRateLimitOrPayloadError, parseRetryAfterMs } from '@/lib/ai/groq-budget';
import { createLogger } from '@/lib/logger';

const log = createLogger('AgentLLM');

export const CHEAP_AGENT_MODEL = 'qwen/qwen3.8-27b';
export const PREMIUM_AGENT_MODEL = 'qwen/qwen3.8-27b';
export const MAX_AGENT_REQUEST_TOKENS = 4800; // Under 5,000 tokens safe boundary

export interface AgentLLMOptions {
  agentName: string;
  portal?: 'matisathi' | 'learn' | 'lesson' | string;
  modelType: 'cheap' | 'premium';
  system: string;
  prompt: string;
  maxOutputTokens?: number;
  temperature?: number;
  fallbackGenerator: () => Promise<string> | string;
  responseFormat?: { type: 'json_object' } | null;
}

export interface AgentLLMResult {
  text: string;
  ms: number;
  fallbackUsed: boolean;
  modelUsed: string;
  tokenEstimate: number;
  error?: string;
}

/**
 * Reads environment variables with dynamic disk reload from .env.local
 * so changes to keys take effect immediately without requiring process restart.
 */
function getLiveEnv(key: string): string | undefined {
  if (process.env[key] && process.env[key]?.trim()) {
    return process.env[key]?.trim();
  }
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const match = content.match(new RegExp(`^${key}=([^\\r\\n#]+)`, 'm'));
      if (match && match[1]) {
        const val = match[1].trim();
        process.env[key] = val;
        return val;
      }
    }
  } catch (err) {
    // ignore
  }
  return undefined;
}

/**
 * Resolves per-portal API keys with graceful fallback.
 * Allows assigning distinct keys to prevent rate limit sharing:
 * - /learn -> GROQ_API_KEY_LEARN
 * - /matisathi -> GROQ_API_KEY_MATISATHI
 * - / -> GROQ_API_KEY_LESSON
 * Fallback -> GROQ_API_KEY -> OPENAI_API_KEY
 */
export function resolvePortalApiKey(portal?: string): { apiKey: string | undefined; baseUrl: string } {
  let apiKey: string | undefined;

  const keyLearn = getLiveEnv('GROQ_API_KEY_LEARN');
  const keyMatisathi = getLiveEnv('GROQ_API_KEY_MATISATHI');
  const keyLesson = getLiveEnv('GROQ_API_KEY_LESSON');
  const keyShared = getLiveEnv('GROQ_API_KEY') || getLiveEnv('OPENAI_API_KEY');

  if (portal === 'learn') {
    apiKey = keyLearn || keyMatisathi || keyShared;
  } else if (portal === 'matisathi') {
    apiKey = keyMatisathi || keyShared;
  } else if (portal === 'lesson') {
    apiKey = keyLesson || keyShared;
  } else {
    apiKey = keyMatisathi || keyShared;
  }

  const baseUrl = (
    getLiveEnv('GROQ_BASE_URL') ||
    getLiveEnv('OPENAI_BASE_URL') ||
    'https://api.groq.com/openai/v1'
  ).replace(/\/+$/, '');

  return { apiKey, baseUrl };
}

function truncateToTokenBudget(text: string, maxTokens: number): string {
  const current = estimateTokens(text);
  if (current <= maxTokens) return text;
  const ratio = maxTokens / current;
  const targetChars = Math.floor(text.length * ratio * 0.95);
  return text.slice(0, targetChars) + '\n\n[...context trimmed to stay within 5,000 token limit...]';
}

/**
 * Executes an LLM call for an agent with Groq retry, backoff, and rule-based fallback.
 */
export async function executeAgentLLM(opts: AgentLLMOptions): Promise<AgentLLMResult> {
  const t0 = Date.now();
  const maxOutputTokens = opts.maxOutputTokens ?? 700;

  // 1. Budget enforcement: ensure system + prompt + maxOutputTokens < 4800 tokens
  const budgetForInput = MAX_AGENT_REQUEST_TOKENS - maxOutputTokens - 50;
  const systemBudget = Math.floor(budgetForInput * 0.4);
  const promptBudget = Math.floor(budgetForInput * 0.6);

  const boundedSystem = truncateToTokenBudget(opts.system, systemBudget);
  const boundedPrompt = truncateToTokenBudget(opts.prompt, promptBudget);

  const { apiKey, baseUrl } = resolvePortalApiKey(opts.portal);
  const modelToUse = process.env.GROQ_MODEL || (opts.modelType === 'premium' ? PREMIUM_AGENT_MODEL : CHEAP_AGENT_MODEL);

  // If live Groq / OpenAI API key is present in environment, call completions endpoint directly
  if (apiKey) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000);

        const res = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: modelToUse,
            messages: [
              { role: 'system', content: boundedSystem },
              { role: 'user', content: boundedPrompt },
            ],
            max_tokens: maxOutputTokens,
            temperature: opts.temperature ?? 0.3,
            ...(opts.responseFormat ? { response_format: opts.responseFormat } : {}),
          }),
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!res.ok) {
          const errBody = await res.text();
          throw new Error(`Groq API error HTTP ${res.status}: ${errBody}`);
        }

        const data = await res.json();
        const text = data?.choices?.[0]?.message?.content?.trim() || '';
        if (text) {
          return {
            text,
            ms: Date.now() - t0,
            fallbackUsed: false,
            modelUsed: modelToUse,
            tokenEstimate: estimateTokens(boundedSystem) + estimateTokens(boundedPrompt) + estimateTokens(text),
          };
        }
      } catch (err) {
        log.warn(`[${opts.agentName}] Direct Groq attempt ${attempt} failed:`, err);
        if (attempt === 1) {
          await new Promise((r) => setTimeout(r, 500));
        }
      }
    }
  }

  // Attempt standard resolveModel if direct fetch didn't return
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const resolved = await resolveModel({
        modelString: modelToUse,
      });

      const response = await callLLM(
        {
          model: resolved.model,
          system: boundedSystem,
          prompt: boundedPrompt,
          maxOutputTokens,
          temperature: opts.temperature ?? 0.3,
        },
        `agent.${opts.agentName}`,
        undefined,
        resolved.thinkingConfig,
        { serverManaged: resolved.serverManaged },
      );

      const text = response.text?.trim() ?? '';
      if (!text) {
        throw new Error(`Empty response from model ${modelToUse}`);
      }

      return {
        text,
        ms: Date.now() - t0,
        fallbackUsed: false,
        modelUsed: modelToUse,
        tokenEstimate: estimateTokens(boundedSystem) + estimateTokens(boundedPrompt) + estimateTokens(text),
      };
    } catch (err: unknown) {
      log.warn(`[${opts.agentName}] Attempt ${attempt} failed:`, err);

      if (attempt === 1 && isGroqRateLimitOrPayloadError(err)) {
        const waitMs = parseRetryAfterMs(err, attempt);
        log.info(`[${opts.agentName}] Rate limit encountered, backing off for ${waitMs}ms...`);
        await new Promise((r) => setTimeout(r, waitMs));
        // Switch to fallback model on second attempt if available
        if (process.env.MODEL_FALLBACK) {
          modelUsed = process.env.MODEL_FALLBACK;
        }
        continue;
      }
    }
  }

  // If 2 attempts fail: switch to rule-based fallback
  log.warn(`[${opts.agentName}] All LLM attempts exhausted. Using rule-based fallback.`);
  try {
    const fallbackText = await opts.fallbackGenerator();
    return {
      text: fallbackText,
      ms: Date.now() - t0,
      fallbackUsed: true,
      modelUsed: 'rule-based-fallback',
      tokenEstimate: estimateTokens(fallbackText),
    };
  } catch (fallbackErr) {
    return {
      text: '',
      ms: Date.now() - t0,
      fallbackUsed: true,
      modelUsed: 'failed-fallback',
      tokenEstimate: 0,
      error: fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr),
    };
  }
}
