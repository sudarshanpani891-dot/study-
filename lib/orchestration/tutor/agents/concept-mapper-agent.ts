/**
 * Agent 2: Concept Mapper Agent
 * Maps the student doubt to a concept in the syllabus graph (subject, chapter, concept, prerequisites).
 * Structured JSON output with confidence metric (0.0 to 1.0).
 * If confidence < 0.6, outputs one short clarifying question.
 */

import { listConcepts, upsertConcept, type ConceptRecord } from '@/lib/server/learner/repository';
import type { DecisionTraceEvent } from '@/lib/server/learner/types';
import type { TutorStateType } from '../state';
import { executeAgentLLM } from '../agent-llm';
import { getAgentLanguageDirective, getLocalizedStrings } from '../language-prompts';

interface ConceptMapperLLMOutput {
  conceptId: string;
  conceptNameEn?: string;
  conceptNameOr?: string;
  confidence: number;
  subject?: string;
  chapter?: string;
  clarifyingQuestion?: string | null;
}

function parseJsonSafe<T>(raw: string, fallback: T): T {
  if (!raw || !raw.trim()) return fallback;
  const stripped = raw
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/```json\s*|\s*```/g, '')
    .trim();

  try {
    return JSON.parse(stripped) as T;
  } catch {
    const match = stripped.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as T;
      } catch {
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const { jsonrepair } = require('jsonrepair');
          return JSON.parse(jsonrepair(match[0])) as T;
        } catch {
          // continue to regex extraction
        }
      }
    }
  }

  // Regex extraction if output was unstructured text
  try {
    const idMatch = raw.match(/["']?conceptId["']?\s*:\s*["']([^"']+)["']/i) || raw.match(/ID:\s*["']?([a-z0-9_-]+)["']?/i);
    const nameEnMatch = raw.match(/["']?conceptNameEn["']?\s*:\s*["']([^"']+)["']/i);
    const nameOrMatch = raw.match(/["']?conceptNameOr["']?\s*:\s*["']([^"']+)["']/i);
    const confMatch = raw.match(/["']?confidence["']?\s*:\s*([0-9.]+)/i);

    if (idMatch || nameEnMatch) {
      return {
        conceptId: idMatch ? idMatch[1] : undefined,
        conceptNameEn: nameEnMatch ? nameEnMatch[1] : undefined,
        conceptNameOr: nameOrMatch ? nameOrMatch[1] : undefined,
        confidence: confMatch ? parseFloat(confMatch[1]) : 0.9,
      } as unknown as T;
    }
  } catch {
    // ignore
  }

  return fallback;
}

/**
 * Keyword-based heuristic fallback if LLM is unavailable.
 */
function matchConceptByKeywords(query: string, concepts: ConceptRecord[]): { concept: ConceptRecord; confidence: number } {
  const lower = query.toLowerCase();

  const keywordMap: Record<string, string> = {
    // Gravitation & Gravity (Physics)
    'gravity': 'phy-gravitation-01',
    'gravitation': 'phy-gravitation-01',
    'gravitational': 'phy-gravitation-01',
    'ମାଧ୍ୟାକର୍ଷଣ': 'phy-gravitation-01',
    'ଗୁରୁତ୍ୱାକର୍ଷଣ': 'phy-gravitation-01',
    // Sound & Waves
    'sound': 'sci-physics-sound',
    'ଶବ୍ଦ': 'sci-physics-sound',
    'echo': 'sci-physics-sound',
    'ଧ୍ୱନି': 'sci-physics-sound',
    // Light & Reflection
    'light': 'sci-physics-light',
    'reflection': 'sci-physics-light',
    'refraction': 'sci-physics-light',
    'ଆଲୋକ': 'sci-physics-light',
    'ପ୍ରତିଫଳନ': 'sci-physics-light',
    'ପ୍ରତିସରଣ': 'sci-physics-light',
    // Work & Energy
    'work and energy': 'sci-physics-work-energy',
    'mechanical work': 'sci-physics-work-energy',
    'kinetic energy': 'sci-physics-work-energy',
    'potential energy': 'sci-physics-work-energy',
    'energy': 'sci-physics-work-energy',
    'କାର୍ଯ୍ୟ ଓ ଶକ୍ତି': 'sci-physics-work-energy',
    'ଗତିଜ ଶକ୍ତି': 'sci-physics-work-energy',
    'ସ୍ଥିତିଜ ଶକ୍ତି': 'sci-physics-work-energy',
    'ଶକ୍ତି': 'sci-physics-work-energy',
    // Friction
    'friction': 'sci-c9-friction',
    'ଘର୍ଷଣ': 'sci-c9-friction',
    // Chemistry & Chemical Reactions
    'chemical': 'sci-chem-reactions',
    'reaction': 'sci-chem-reactions',
    'reactions': 'sci-chem-reactions',
    'chemistry': 'sci-chem-reactions',
    'reactant': 'sci-chem-reactions',
    'product': 'sci-chem-reactions',
    'ରାସାୟନିକ': 'sci-chem-reactions',
    'ପ୍ରତିକ୍ରିୟା': 'sci-chem-reactions',
    'ରାସାୟନିକ ପ୍ରତିକ୍ରିୟା': 'sci-chem-reactions',
    'acid': 'sci-chem-acids-bases',
    'base': 'sci-chem-acids-bases',
    'ଅମ୍ଳ': 'sci-chem-acids-bases',
    'କ୍ଷାର': 'sci-chem-acids-bases',
    // Atoms & Matter
    'atom': 'sci-atoms-molecules',
    'atoms': 'sci-atoms-molecules',
    'molecule': 'sci-atoms-molecules',
    'molecules': 'sci-atoms-molecules',
    'ପରମାଣୁ': 'sci-atoms-molecules',
    'ଅଣୁ': 'sci-atoms-molecules',
    'matter': 'sci-matter-states',
    'solid': 'sci-matter-states',
    'liquid': 'sci-matter-states',
    'gas': 'sci-matter-states',
    'ବାଷ୍ପୀଭବନ': 'sci-matter-states',
    'evaporation': 'sci-matter-states',
    // Biology & Cell
    'କୋଷ': 'sci-c5-cell-basics',
    'cell': 'sci-c5-cell-basics',
    'ପ୍ରାଚୀର': 'sci-c5-cell-wall',
    'cell wall': 'sci-c5-cell-wall',
    'ଝିଲ୍ଲୀ': 'sci-c5-cell-membrane',
    'cell membrane': 'sci-c5-cell-membrane',
    'membrane': 'sci-c5-cell-membrane',
    'semi-permeable': 'sci-c5-cell-membrane',
    'semipermeable': 'sci-c5-cell-membrane',
    'ଅର୍ଦ୍ଧ-ପାରଗମ୍ୟ': 'sci-c5-cell-membrane',
    'ଅର୍ଦ୍ଧପାରଗମ୍ୟ': 'sci-c5-cell-membrane',
    'ପାରଗମ୍ୟ': 'sci-c5-cell-membrane',
    'ନ୍ୟୁକ୍ଲିଅସ୍': 'sci-c5-nucleus',
    'nucleus': 'sci-c5-nucleus',
    'ପରାସରଣ': 'sci-c5-osmosis',
    'osmosis': 'sci-c5-osmosis',
    'ବିସରଣ': 'sci-c5-cell-membrane',
    'diffusion': 'sci-c5-cell-membrane',
    'mitochondria': 'sci-c5-mitochondria',
    'ମାଇଟୋକଣ୍ଡ୍ରିଆ': 'sci-c5-mitochondria',
    'photosynthesis': 'sci-c5-plastids',
    'ଆଲୋକ ସ୍ଲେଷଣ': 'sci-c5-plastids',
    // Physics & Motion
    'ଗତି': 'sci-c8-motion-rest',
    'motion': 'sci-c8-motion-rest',
    'ବଳ': 'sci-c9-newton-laws',
    'force': 'sci-c9-newton-laws',
    'newton': 'sci-c9-newton-laws',
    'ନିଉଟନ': 'sci-c9-newton-laws',
    'inertia': 'sci-c9-newton-laws',
    'ଜଡ଼ତା': 'sci-c9-newton-laws',
    'ତ୍ୱରଣ': 'sci-c8-acceleration',
    'acceleration': 'sci-c8-acceleration',
    'ସାଇକେଲ': 'sci-c8-motion-rest',
    'ଉଡ଼ାଜାହାଜ': 'sci-c8-motion-rest',
    'bernoulli': 'sci-c8-motion-rest',
  };

  const sortedEntries = Object.entries(keywordMap).sort((a, b) => b[0].length - a[0].length);
  for (const [kw, cid] of sortedEntries) {
    if (lower.includes(kw)) {
      const found = concepts.find((c) => c.id === cid);
      if (found) return { concept: found, confidence: 0.95 };
      return {
        concept: {
          id: cid,
          nameOr: kw,
          nameEn: cid.replace(/^(sci|phy)-/, '').replace(/-/g, ' '),
          subject: 'Science',
          chapter: 'Class 9 Science',
          prerequisites: [],
          createdAt: '',
        },
        confidence: 0.9,
      };
    }
  }

  // General match by concept name
  for (const c of concepts) {
    if (lower.includes(c.nameOr.toLowerCase()) || lower.includes(c.nameEn.toLowerCase())) {
      return { concept: c, confidence: 0.85 };
    }
  }

  // Fallback: Dynamically generate concept from user's actual question words.
  // NEVER default blindly to concepts[0] (which is Chemical Reactions)!
  const cleaned = query.replace(/[?.,!]/g, '').trim();
  const slug = cleaned.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'general-science';
  const title = cleaned.length > 0 ? (cleaned.charAt(0).toUpperCase() + cleaned.slice(1)) : 'General Science';

  return {
    concept: {
      id: `topic-${slug}`,
      nameOr: cleaned,
      nameEn: title,
      subject: 'Science',
      chapter: 'Class 9 Science',
      prerequisites: [],
      createdAt: '',
    },
    confidence: 0.8,
  };
}

export async function runConceptMapperAgent(state: TutorStateType): Promise<Partial<TutorStateType>> {
  const t0 = Date.now();
  const query = state.currentDoubt.normalizedText;
  const langDirective = getAgentLanguageDirective(state.language);
  const localized = getLocalizedStrings(state.language);

  // 1. Fetch available syllabus concepts
  let concepts: ConceptRecord[] = [];
  try {
    concepts = await listConcepts(state.queryable);
  } catch (err) {
    console.warn('[ConceptMapper] Failed to load concepts from DB:', err);
  }

  if (concepts.length === 0) {
    // Fallback stub concepts
    concepts = [
      { id: 'sci-c5-cell-basics', subject: 'Science', chapter: 'Chapter 5: Cell', nameOr: 'କୋଷ ଏବଂ ଏହାର ଆବିଷ୍କାର', nameEn: 'Cell Basics', prerequisites: [], createdAt: '' },
      { id: 'sci-c5-cell-wall', subject: 'Science', chapter: 'Chapter 5: Cell', nameOr: 'କୋଷ ପ୍ରାଚୀର', nameEn: 'Cell Wall', prerequisites: ['sci-c5-cell-membrane'], createdAt: '' },
      { id: 'sci-c5-cell-membrane', subject: 'Science', chapter: 'Chapter 5: Cell', nameOr: 'ପ୍ଲାଜ୍ମା ଝିଲ୍ଲୀ', nameEn: 'Cell Membrane', prerequisites: ['sci-c5-cell-basics'], createdAt: '' },
      { id: 'sci-chem-reactions', subject: 'Science', chapter: 'Chapter 1: Chemical Reactions', nameOr: 'ରାସାୟନିକ ପ୍ରତିକ୍ରିୟା', nameEn: 'Chemical Reactions and Equations', prerequisites: [], createdAt: '' },
    ];
  }

  const conceptCatalogueText = concepts
    .map((c) => `- ID: "${c.id}" | Name: "${c.nameOr}" / "${c.nameEn}" | Chapter: "${c.chapter}" | Prerequisites: [${c.prerequisites.join(', ')}]`)
    .join('\n');

  const systemPrompt = `You are the Concept Mapper Agent in an educational tutor for Odisha Class 9 students.
Your job is to map the student's doubt to the most accurate concept from the syllabus catalogue.

${langDirective}

Available Syllabus Concepts:
${conceptCatalogueText}

Instructions:
1. Identify the most specific relevant concept from the catalogue.
2. If the user's doubt is about a school science topic that is NOT yet in the catalogue (e.g. Chemical Reactions, Acids & Bases, Gravitation, Sound, Electricity), provide a clean concept ID (e.g. "sci-chem-reactions", "sci-physics-sound"), along with its English and Odia names, subject ("Science"), and chapter.
3. If the query asks about ANY science topic, question, or concept (e.g. "tell me about chemical reactions", "what is cell", "why is milk converted to curd"), you MUST set confidence to 0.9 or 0.95 and clarifyingQuestion to null so the student gets taught immediately.
4. ONLY if the query is complete gibberish or a single random word with no academic meaning, set confidence below 0.5 and provide a friendly clarifying question.
5. Output MUST be valid JSON only with keys:
{
  "conceptId": "concept-id",
  "conceptNameEn": "Topic Name in English",
  "conceptNameOr": "ବିଷୟର ଓଡ଼ିଆ ନାମ",
  "subject": "Science",
  "chapter": "Chapter Name",
  "confidence": 0.95,
  "clarifyingQuestion": null
}`;

  const kwMatch = matchConceptByKeywords(query, concepts);
  const suggestionHint = kwMatch.confidence >= 0.85
    ? `\nSuggested Match from Catalogue: "${kwMatch.concept.id}" (${kwMatch.concept.nameEn} / ${kwMatch.concept.nameOr})`
    : '';

  const userPrompt = `Student Doubt: "${query}"${suggestionHint}`;

  const fallbackHarness = () => {
    return JSON.stringify({
      conceptId: kwMatch.concept.id,
      conceptNameEn: kwMatch.concept.nameEn,
      conceptNameOr: kwMatch.concept.nameOr,
      confidence: kwMatch.confidence,
      clarifyingQuestion: kwMatch.confidence < 0.6 ? localized.clarifyingQuestionPrompt : null,
    });
  };

  const llmResult = await executeAgentLLM({
    agentName: 'concept_mapper',
    portal: state.portal,
    modelType: 'cheap', // qwen/qwen3.8-27b
    system: systemPrompt,
    prompt: userPrompt,
    maxOutputTokens: 800,
    temperature: 0.1,
    fallbackGenerator: fallbackHarness,
    responseFormat: { type: 'json_object' },
  });

  const parsed = parseJsonSafe<ConceptMapperLLMOutput>(llmResult.text, {
    conceptId: kwMatch.concept.id,
    conceptNameEn: kwMatch.concept.nameEn,
    conceptNameOr: kwMatch.concept.nameOr,
    confidence: kwMatch.confidence,
  });

  console.log('[ConceptMapperDebug] query:', query);
  console.log('[ConceptMapperDebug] llmResult text:', llmResult.text);
  console.log('[ConceptMapperDebug] parsed:', JSON.stringify(parsed));
  console.log('[ConceptMapperDebug] kwMatch:', kwMatch.concept.id, kwMatch.confidence);

  // 1. Try finding in loaded syllabus concepts by ID or name
  let resolvedConcept = concepts.find(
    (c) =>
      c.id === parsed.conceptId ||
      (parsed.conceptNameEn && c.nameEn.toLowerCase() === parsed.conceptNameEn.toLowerCase()) ||
      (parsed.conceptNameOr && c.nameOr.toLowerCase() === parsed.conceptNameOr.toLowerCase())
  );

  // 2. If keyword match had strong confidence, use that
  if (!resolvedConcept && kwMatch.confidence >= 0.85) {
    resolvedConcept = kwMatch.concept;
  }

  // 3. If LLM proposed a new valid concept not yet in DB catalogue, dynamically persist it
  if (!resolvedConcept && (parsed.conceptNameEn || parsed.conceptId)) {
    try {
      const sanitizedId = (parsed.conceptId || kwMatch.concept.id).toLowerCase().replace(/[^a-z0-9_-]/g, '-');
      const newConcept = await upsertConcept(state.queryable, {
        id: sanitizedId,
        subject: parsed.subject || 'Science',
        chapter: parsed.chapter || 'Class 9 Science',
        nameOr: parsed.conceptNameOr || parsed.conceptNameEn || kwMatch.concept.nameOr,
        nameEn: parsed.conceptNameEn || kwMatch.concept.nameEn,
        prerequisites: [],
      });
      resolvedConcept = newConcept;
    } catch (e) {
      console.warn('[ConceptMapper] Could not dynamically upsert new concept:', e);
      resolvedConcept = {
        id: (parsed.conceptId || kwMatch.concept.id).toLowerCase().replace(/[^a-z0-9_-]/g, '-'),
        subject: parsed.subject || 'Science',
        chapter: parsed.chapter || 'Class 9 Science',
        nameOr: parsed.conceptNameOr || kwMatch.concept.nameOr,
        nameEn: parsed.conceptNameEn || kwMatch.concept.nameEn,
        prerequisites: [],
        createdAt: '',
      };
    }
  }

  // 4. Default to kwMatch.concept (which is generated from the query), NEVER concepts[0]
  if (!resolvedConcept) {
    resolvedConcept = kwMatch.concept;
  }

  const confidence = typeof parsed.confidence === 'number' ? Math.max(0, Math.min(1, parsed.confidence)) : kwMatch.confidence;
  const clarifyingQuestion = confidence < 0.6 ? (parsed.clarifyingQuestion || localized.clarifyingQuestionPrompt) : null;

  const trace: DecisionTraceEvent = {
    learnerId: state.learnerId,
    turnId: state.turnId,
    agent: 'concept_mapper',
    node: 'concept_mapper',
    tool: 'mapConcept',
    input: { query },
    output: { conceptId: resolvedConcept.id, confidence, clarifyingQuestion, rawLlmText: llmResult.text },
    inputSummary: `Query: ${query.slice(0, 50)}`,
    outputSummary: `Mapped to: ${resolvedConcept.nameEn} (${(confidence * 100).toFixed(0)}% conf)`,
    reason: `LLM raw: ${llmResult.text.slice(0, 100)} | confidence: ${confidence}`,
    ms: llmResult.ms,
    latencyMs: llmResult.ms,
    status: confidence >= 0.6 ? 'success' : 'clarification_needed',
    fallbackUsed: llmResult.fallbackUsed,
  };

  return {
    detectedConcept: {
      id: resolvedConcept.id,
      subject: resolvedConcept.subject,
      chapter: resolvedConcept.chapter,
      nameOr: resolvedConcept.nameOr,
      nameEn: resolvedConcept.nameEn,
      prerequisites: resolvedConcept.prerequisites,
      confidence,
      clarifyingQuestion,
    },
    traces: [trace],
    nextAgent: confidence < 0.6 ? 'language_guard' : 'diagnostician',
    finalAnswer: clarifyingQuestion,
  };
}
