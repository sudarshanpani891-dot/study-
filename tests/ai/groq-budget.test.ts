import { describe, expect, it } from 'vitest';
import { estimateTokens, estimateRequestTokens } from '@/lib/ai/token-estimator';
import {
  getGroqMaxRequestTokens,
  isLiteModeEnabled,
  isLiteLessonRequest,
  isGroqRequest,
  applyGroqRequestBudget,
  isGroqRateLimitOrPayloadError,
  parseRetryAfterMs,
  CONDENSED_SLIDE_CONTENT_SYSTEM_PROMPT,
  CONDENSED_OUTLINE_SYSTEM_PROMPT,
} from '@/lib/ai/groq-budget';
import { isRetryableLlmError, shouldFallbackFor } from '@/lib/server/llm-fallback';
import { APICallError } from 'ai';

describe('Token Estimation per Request (js-tiktoken)', () => {
  it('estimates tokens accurately for simple strings using js-tiktoken', () => {
    const text = 'Hello, this is a test course for class 9 students in Odisha.';
    const count = estimateTokens(text);
    expect(count).toBeGreaterThan(5);
    expect(count).toBeLessThan(25);
  });

  it('returns 0 for empty or null strings', () => {
    expect(estimateTokens('')).toBe(0);
    expect(estimateTokens(null)).toBe(0);
    expect(estimateTokens(undefined)).toBe(0);
  });

  it('estimates request tokens across system, user prompt, messages, and output reserve', () => {
    const params = {
      model: 'openai/gpt-oss-120b',
      system: 'You are an educational tutor in Odia.',
      prompt: 'Explain Photosynthesis in simple Odia words with examples.',
      maxOutputTokens: 2000,
    };

    const estimate = estimateRequestTokens(params);
    expect(estimate.inputTokens).toBeGreaterThan(15);
    expect(estimate.outputBudget).toBe(2000);
    expect(estimate.totalEstimatedTokens).toBe(estimate.inputTokens + 2000);
  });

  it('includes multimodal image allowance and tool overhead in token estimate', () => {
    const params = {
      model: 'openai/gpt-oss-120b',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Analyze this plant cell diagram.' },
            { type: 'image', image: 'data:image/png;base64,...' },
          ],
        },
      ],
      tools: {
        getDefinition: {
          description: 'Lookup term in Odia textbook',
          parameters: {},
        },
      },
      maxOutputTokens: 1000,
    };

    const estimate = estimateRequestTokens(params as never);
    // 350 tokens allowance for image + tool overhead + text
    expect(estimate.inputTokens).toBeGreaterThan(350);
    expect(estimate.totalEstimatedTokens).toBe(estimate.inputTokens + 1000);
  });
});

describe('Groq Budget & Trimming Engine', () => {
  it('defaults GROQ_MAX_REQUEST_TOKENS to 6000', () => {
    const budget = getGroqMaxRequestTokens();
    expect(budget).toBe(6000);
  });

  it('detects Groq requests by base URL or model identifier', () => {
    expect(isGroqRequest({ model: 'openai/gpt-oss-120b' } as never)).toBe(true);
    expect(isGroqRequest({ model: 'llama-3.3-70b-versatile' } as never)).toBe(true);
  });

  it('identifies 5-minute and lite lesson requests', () => {
    const saved = process.env.GROQ_LITE_MODE;
    delete process.env.GROQ_LITE_MODE;
    try {
      expect(isLiteLessonRequest('Create a 5-minute lesson on gravity')).toBe(true);
      expect(isLiteLessonRequest('5min lesson on soil')).toBe(true);
      expect(isLiteLessonRequest('Micro-lesson on plant cell')).toBe(true);
      expect(isLiteLessonRequest('Quick lesson for Class 9 in Odia')).toBe(true);
      expect(isLiteLessonRequest('Comprehensive 45-minute semester syllabus')).toBe(false);
      process.env.GROQ_LITE_MODE = 'true';
      expect(isLiteLessonRequest('Comprehensive 45-minute semester syllabus')).toBe(true);
    } finally {
      if (saved !== undefined) process.env.GROQ_LITE_MODE = saved;
      else delete process.env.GROQ_LITE_MODE;
    }
  });

  it('condenses oversized 10,332 token slide content request down below 6000 budget', () => {
    // Simulate the exact 30KB slide content generator template that triggered 10,332 tokens
    const oversizedSystemPrompt = `
      # Slide Content Generator
      Canvas Specifications: 960x540
      ${'Very verbose guidelines with lots of layout and height lookup tables. '.repeat(500)}
    `;

    const oversizedParams = {
      model: 'openai/gpt-oss-120b',
      system: oversizedSystemPrompt,
      prompt: 'Generate slide 1 for Class 9 Photosynthesis in Odia with visual elements',
      maxOutputTokens: 4096, // large default window
    };

    const initialEstimate = estimateRequestTokens(oversizedParams);
    expect(initialEstimate.totalEstimatedTokens).toBeGreaterThan(6000);

    const budgeted = applyGroqRequestBudget(oversizedParams, 'scene-content', 6000);

    const finalEstimate = estimateRequestTokens(budgeted);
    expect(finalEstimate.totalEstimatedTokens).toBeLessThanOrEqual(6000);
    expect(budgeted.maxOutputTokens).toBeLessThanOrEqual(1600);
    expect(budgeted.system).toContain('Slide Content Generator (Lite Mode)');
  });

  it('condenses oversized outline generator prompt when exceeding budget', () => {
    const oversizedOutlineSystem = `
      # Scene Outline Generator
      SceneOutline specs:
      ${'Course planning guidelines and verbose instructional design principles. '.repeat(400)}
    `;

    const params = {
      model: 'openai/gpt-oss-120b',
      system: oversizedOutlineSystem,
      prompt: 'Plan course on Odisha Geography',
      maxOutputTokens: 3000,
    };

    const budgeted = applyGroqRequestBudget(params, 'outline', 6000);
    expect(budgeted.system).toContain('Scene Outline Generator (Lite Mode)');
    expect(estimateRequestTokens(budgeted).totalEstimatedTokens).toBeLessThanOrEqual(6000);
  });
});

describe('Groq Retry & Backoff Engine', () => {
  it('identifies Groq rate limit (429) and payload size limit (413) errors', () => {
    const err429 = new APICallError({
      message: 'Rate limit reached for model openai/gpt-oss-120b: TPM limit 8000',
      url: 'https://api.groq.com/openai/v1/chat/completions',
      requestBodyValues: {},
      statusCode: 429,
    });

    const err413 = new APICallError({
      message: 'Request too large for model openai/gpt-oss-120b: Requested 10332 tokens, limit: 8000',
      url: 'https://api.groq.com/openai/v1/chat/completions',
      requestBodyValues: {},
      statusCode: 413,
    });

    expect(isGroqRateLimitOrPayloadError(err429)).toBe(true);
    expect(isGroqRateLimitOrPayloadError(err413)).toBe(true);
  });

  it('parses Retry-After header in seconds', () => {
    const error = {
      responseHeaders: { 'retry-after': '3.5' },
    };
    const ms = parseRetryAfterMs(error, 1);
    expect(ms).toBe(3700); // 3500 + 200ms safety buffer
  });

  it('parses wait time from error message "try again in X.XXs"', () => {
    const error = new Error('Rate limit reached. Please try again in 2.45s');
    const ms = parseRetryAfterMs(error, 1);
    expect(ms).toBe(2750); // 2450 + 300ms buffer
  });

  it('falls back to exponential backoff with jitter when no header is present', () => {
    const error = new Error('Generic rate limit error');
    const ms1 = parseRetryAfterMs(error, 1);
    const ms2 = parseRetryAfterMs(error, 2);

    expect(ms1).toBeGreaterThanOrEqual(1500);
    expect(ms2).toBeGreaterThanOrEqual(3000);
  });
});

describe('Fallback Decision for Groq TPM Errors', () => {
  it('classifies 413 and Groq TPM limits as retryable for MODEL_FALLBACK', () => {
    const err = new APICallError({
      message: 'Request too large on TPM limit 8000. Requested 10332 tokens',
      url: 'https://api.groq.com/openai/v1/chat/completions',
      requestBodyValues: {},
      statusCode: 413,
      isRetryable: false, // AI SDK marks 413 false by default
    });

    // Our patch ensures 413 / Groq TPM limits qualify for fallback
    expect(isRetryableLlmError(err)).toBe(true);
    expect(shouldFallbackFor(err, undefined)).toBe(true);
  });
});

describe('User-Facing Error Messages', () => {
  it('formats clear user-facing guidance when TPM limit is reached', async () => {
    const { sceneFailureText, runFailureText } = await import(
      '@/lib/generation-run-client/failure-message'
    );
    const msg = 'Request too large for model openai/gpt-oss-120b: TPM limit 8000';
    const sceneText = sceneFailureText({ message: msg, statusCode: 413 });
    expect(sceneText).toEqual({
      text: 'Groq Free Tier TPM limit reached (~8,000 tokens/min). OpenMAIC applied request token budgeting and retry backoff. Try a 5-minute Lite lesson or verify MODEL_FALLBACK.',
    });

    const runText = runFailureText({
      step: 'outline',
      message: msg,
      statusCode: 413,
    });
    expect(runText).toEqual({
      text: 'Groq Free Tier TPM limit reached (~8,000 tokens/min). OpenMAIC applied request token budgeting and retry backoff. Try a 5-minute Lite lesson or verify MODEL_FALLBACK.',
    });
  });
});

