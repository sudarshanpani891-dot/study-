/**
 * Groq Token Budget & Rate-Limit Resilience Engine
 *
 * Enforces configurable request token budget (GROQ_MAX_REQUEST_TOKENS, default 6000)
 * to comply with Groq's free tier ~8,000 TPM limit.
 * Trims and condenses context, clamps output budgets, and handles exponential
 * backoff + jitter on 429 and 413 responses with Retry-After header parsing.
 */

import type { generateText, streamText } from 'ai';
import { estimateTokens, estimateRequestTokens } from './token-estimator';
import { createLogger } from '@/lib/logger';

const log = createLogger('GroqBudget');

type GenerateTextParams = Parameters<typeof generateText>[0];
type StreamTextParams = Parameters<typeof streamText>[0];

export const DEFAULT_GROQ_MAX_REQUEST_TOKENS = 6000;

export function getGroqMaxRequestTokens(): number {
  const envVal = process.env.GROQ_MAX_REQUEST_TOKENS?.trim();
  if (envVal) {
    const parsed = parseInt(envVal, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return DEFAULT_GROQ_MAX_REQUEST_TOKENS;
}

export function isLiteModeEnabled(): boolean {
  if (process.env.GROQ_LITE_MODE === 'true' || process.env.LESSON_MODE === 'lite') {
    return true;
  }
  return false;
}

/**
 * Checks if a requirement prompt or environment requests a 5-minute / lite micro-lesson.
 */
export function isLiteLessonRequest(requirementText?: string): boolean {
  if (isLiteModeEnabled()) return true;
  if (!requirementText) return false;
  return /\b5[\s-]?min(?:ute)?s?\b|\bmicro[\s-]?lesson\b|\bshort[\s-]?lesson\b|\blite[\s-]?mode\b|\bquick[\s-]?lesson\b/i.test(
    requirementText,
  );
}

/**
 * Detect whether a request targets Groq (directly or via OpenAI-compatible endpoint).
 */
export function isGroqRequest(params: GenerateTextParams | StreamTextParams): boolean {
  const m = params.model;
  let provider = '';
  let modelId = '';

  if (typeof m === 'string') {
    modelId = m;
    if (m.includes(':')) {
      const parts = m.split(':');
      provider = parts[0];
      modelId = parts.slice(1).join(':');
    }
  } else if (m && typeof m === 'object') {
    if ('provider' in m) provider = String((m as { provider?: unknown }).provider || '');
    if ('modelId' in m) modelId = String((m as { modelId?: unknown }).modelId || '');
  }

  // Definite non-Groq providers
  if (
    provider &&
    (provider === 'deepseek' ||
      provider === 'anthropic' ||
      provider === 'google' ||
      provider === 'openai.responses' ||
      provider === 'azure' ||
      provider === 'minimax' ||
      provider === 'bedrock')
  ) {
    return false;
  }

  // Model ID matches Groq supported open models
  if (/llama|gpt-oss|qwen.*27b|mixtral|gemma|groq/i.test(modelId)) {
    return true;
  }

  // If OPENAI_BASE_URL is Groq and provider is openai or generic
  const baseUrl = process.env.OPENAI_BASE_URL || '';
  if (baseUrl.includes('api.groq.com') && (!provider || provider === 'openai')) {
    // Exclude official OpenAI closed models
    if (!/^gpt-[345]|^o[134]/i.test(modelId)) {
      return true;
    }
  }

  return false;
}

/**
 * Condensed system prompt for Slide Content generation in Lite / Budget mode.
 * Drops the 30KB full template down to ~2KB (~600 tokens) while retaining 100%
 * of the required canvas specs, JSON structure, allowed HTML elements, and LaTeX rules.
 */
export const CONDENSED_SLIDE_CONTENT_SYSTEM_PROMPT = `# Slide Content Generator (Lite Mode)

You are an educational content designer. Generate well-structured slide components with precise layouts.

## Canvas Specifications
- Dimensions: 960 × 540
- Margins: Top ≥ 50, Bottom ≤ 490, Left ≥ 50, Right ≤ 910
- Alignment: Left = 60 or 80; Centered: (960 - width) / 2

## Output Structure
Output must be a valid JSON object:
\`\`\`json
{
  "background": {
    "type": "solid",
    "color": "#ffffff"
  },
  "elements": []
}
\`\`\`

## Supported Element Types
1. **text**:
   \`\`\`json
   {
     "id": "text_001", "type": "text", "left": 60, "top": 80, "width": 840, "height": 60,
     "content": "<p style=\\"font-size: 24px;\\">Title</p>",
     "defaultFontName": "", "defaultColor": "#333333"
   }
   \`\`\`
   - HTML tags: <p>, <span>, <strong>, <b>, <em>, <i>, <u>, <h1>-<h6>.
   - NO inline LaTeX in text element (no \\frac, \\sum). Use latex element for formulas!

2. **latex**:
   \`\`\`json
   {
     "id": "math_001", "type": "latex", "left": 60, "top": 160, "width": 400, "height": 60,
     "code": "E = mc^2", "fontSize": 24, "color": "#111827"
   }
   \`\`\`

3. **shape**:
   \`\`\`json
   {
     "id": "shape_001", "type": "shape", "left": 60, "top": 150, "width": 840, "height": 280,
     "shapeType": "roundRect", "fill": "#f3f4f6", "radius": 12
   }
   \`\`\`

4. **chart**:
   \`\`\`json
   {
     "id": "chart_001", "type": "chart", "left": 60, "top": 160, "width": 450, "height": 280,
     "chartType": "bar", "chartData": { "categories": ["A", "B"], "series": [{ "name": "Val", "data": [10, 20] }] }
   }
   \`\`\`

Keep slide clean, visual, concise, and scannable (<25 words per point). Return valid JSON only.`;

/**
 * Condensed system prompt for Outline generation in Lite / Budget mode.
 * Drops the 18KB full template down to ~1.2KB (~350 tokens).
 */
export const CONDENSED_OUTLINE_SYSTEM_PROMPT = `# Scene Outline Generator (Lite Mode)

You are a professional course content designer. Transform user requirements into structured scene outlines (SceneOutline).

## Core Task
Generate a concise, structured 5-minute micro-lesson outline with:
1. languageDirective: 2-3 sentences specifying teaching language, tone, and terminology handling.
2. courseTitle: Crisp course title (≤ 30 characters).
3. outlines: Array of 3 to 5 SceneOutline objects (recommended 4 scenes).

## Scene Types
- slide: Presentation slide (content: text, shape, chart, latex)
- quiz: Assessment (single/multiple choice, short answer)
- interactive: Simulation, interactive widget

## Output Format
\`\`\`json
{
  "languageDirective": "Teach in English/Odia...",
  "courseTitle": "Course Title",
  "outlines": [
    {
      "id": "scene_1",
      "type": "slide",
      "title": "Scene Title",
      "description": "Short description of this scene",
      "keyPoints": ["Point 1", "Point 2"]
    }
  ]
}
\`\`\`
Return valid JSON only. Keep descriptions and key points brief and focused.`;

/**
 * Condense an oversized system prompt if it contains repetitive guidelines.
 */
function condenseSystemPrompt(system: string): string {
  if (system.includes('Slide Content Generator') || system.includes('Canvas Specifications')) {
    return CONDENSED_SLIDE_CONTENT_SYSTEM_PROMPT;
  }

  if (system.includes('Scene Outline Generator') || system.includes('SceneOutline')) {
    return CONDENSED_OUTLINE_SYSTEM_PROMPT;
  }

  // General condensation: strip excessive markdown headings and verbose examples
  if (system.length > 6000) {
    const lines = system.split('\n');
    const pruned: string[] = [];
    let skippingExamples = false;

    for (const line of lines) {
      if (line.startsWith('### Example') || line.startsWith('## Height Lookup Table')) {
        skippingExamples = true;
        continue;
      }
      if (skippingExamples && line.startsWith('## ')) {
        skippingExamples = false;
      }
      if (!skippingExamples) {
        pruned.push(line);
      }
    }
    const result = pruned.join('\n');
    return result.length > 5000
      ? result.slice(0, 5000) + '\n\n[...guidelines trimmed for budget...]'
      : result;
  }

  return system;
}

/**
 * Truncate long user prompt / reference material context to fit budget.
 */
function trimTextContent(text: string, maxAllowedChars: number): string {
  if (text.length <= maxAllowedChars) return text;
  const headChars = Math.floor(maxAllowedChars * 0.6);
  const tailChars = Math.floor(maxAllowedChars * 0.35);
  return `${text.slice(0, headChars)}\n\n[...context trimmed to fit Groq 8k TPM budget...]\n\n${text.slice(-tailChars)}`;
}

/**
 * Enforces the configurable max request budget on any generateText or streamText request.
 * Trims context, condenses system prompts, and clamps output tokens.
 */
export function applyGroqRequestBudget<T extends GenerateTextParams | StreamTextParams>(
  params: T,
  source: string,
  maxBudget = getGroqMaxRequestTokens(),
): T {
  const isLite = isLiteModeEnabled();
  const initialEstimate = estimateRequestTokens(params);
  if (initialEstimate.totalEstimatedTokens <= maxBudget && !isLite) {
    return params;
  }

  log.info(
    `[${source}] Applying Groq budget (estimate=${initialEstimate.totalEstimatedTokens}, budget=${maxBudget}, lite=${isLite})`,
  );

  const modified = { ...params } as Record<string, unknown>;

  // 1. Clamp output budget reserve first
  const currentOutputBudget =
    typeof modified.maxOutputTokens === 'number' && modified.maxOutputTokens > 0
      ? modified.maxOutputTokens
      : 1500;

  // Never allow maxOutputTokens to exceed 1600 on Groq budget mode
  const clampedOutput = Math.min(currentOutputBudget, 1600);
  modified.maxOutputTokens = clampedOutput;

  // Remaining budget for input tokens (system + user prompt + framing)
  const remainingInputBudget = Math.max(1200, maxBudget - clampedOutput - 150);

  // 2. Condense system prompt if oversized or in lite mode
  if (typeof modified.system === 'string') {
    const systemTokens = estimateTokens(modified.system);
    if (isLite || systemTokens > remainingInputBudget * 0.45) {
      modified.system = condenseSystemPrompt(modified.system);
    }
  }

  // 3. Trim user prompt if oversized
  const systemTokensNow = typeof modified.system === 'string' ? estimateTokens(modified.system) : 0;
  const userBudgetTokens = Math.max(600, remainingInputBudget - systemTokensNow - 100);
  const userMaxChars = Math.floor(userBudgetTokens * 3.5);

  if (typeof modified.prompt === 'string') {
    modified.prompt = trimTextContent(modified.prompt, userMaxChars);
  }

  if (Array.isArray(modified.messages)) {
    modified.messages = modified.messages.map((m) => {
      if (typeof m === 'object' && m !== null && 'content' in m) {
        const msg = m as { role: string; content: unknown };
        if (typeof msg.content === 'string') {
          return { ...msg, content: trimTextContent(msg.content, userMaxChars) };
        }
      }
      return m;
    });
  }

  const finalEstimate = estimateRequestTokens(modified as T);
  log.info(
    `[${source}] Trimmed request from ${initialEstimate.totalEstimatedTokens} to ${finalEstimate.totalEstimatedTokens} tokens (budget: ${maxBudget})`,
  );

  return modified as T;
}

/**
 * Checks whether an error is a Groq rate-limit (429), payload size limit (413),
 * or TPM quota limit message.
 */
export function isGroqRateLimitOrPayloadError(error: unknown): boolean {
  if (!error) return false;
  const msg = error instanceof Error ? error.message : String(error);
  const errObj = error as { statusCode?: number; status?: number };
  const status = errObj.statusCode ?? errObj.status;

  if (status === 429 || status === 413) return true;

  return /request too large|tpm limit|rate_limit|tokens per minute|rate limit reached|quota.*exceeded/i.test(
    msg,
  );
}

/**
 * Extracts wait time in ms for retry, honoring Retry-After headers or error messages.
 */
export function parseRetryAfterMs(error: unknown, attempt: number): number {
  const err = error as {
    responseHeaders?: Record<string, string>;
    headers?: Record<string, string>;
  };
  const headers = err.responseHeaders || err.headers;

  if (headers) {
    const retryAfter = headers['retry-after'] || headers['Retry-After'];
    if (retryAfter) {
      const seconds = parseFloat(retryAfter);
      if (!isNaN(seconds) && seconds > 0) {
        return Math.min(20000, Math.ceil(seconds * 1000) + 200);
      }
      const date = new Date(retryAfter).getTime();
      if (!isNaN(date) && date > Date.now()) {
        return Math.min(20000, Math.max(500, date - Date.now() + 200));
      }
    }
  }

  // Check error message string for "try again in X.XXs"
  const msg = error instanceof Error ? error.message : String(error);
  const match = msg.match(/try again in ([\d.]+)s/i) || msg.match(/wait ([\d.]+)s/i);
  if (match && match[1]) {
    const s = parseFloat(match[1]);
    if (!isNaN(s) && s > 0) {
      return Math.min(20000, Math.ceil(s * 1000) + 300);
    }
  }

  // Exponential backoff with jitter: 1.5s, 3s, 6s + jitter
  const base = 1500 * Math.pow(2, attempt - 1);
  const jitter = Math.floor(Math.random() * 600);
  return Math.min(15000, base + jitter);
}
