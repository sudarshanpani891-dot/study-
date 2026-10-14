/**
 * Multi-Agent Conversational Portal API
 * POST /api/portal/chat
 *
 * Provides instant ChatGPT-style conversational responses in any language,
 * with collaborative contributions from active student/assistant agents
 * (Note Taker, Class Clown, Curious Mind, Deep Thinker, AI Assistant).
 */

import { NextRequest, NextResponse } from 'next/server';
import { resolveModelFromRequest } from '@/lib/server/resolve-model';
import { callLLM } from '@/lib/ai/llm';
import { createLogger } from '@/lib/logger';

const log = createLogger('Portal Chat API');

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface PortalChatRequest {
  messages: ChatMessage[];
  activeAgentIds?: string[];
  model?: string;
  preferredLanguage?: 'odia' | 'english' | string;
}

export interface AgentContribution {
  id?: string;
  agentId: string;
  name?: string;
  agentName: string;
  role: 'teacher' | 'assistant' | 'student';
  avatar: string;
  color: string;
  title: string;
  content: string;
}

export interface PortalChatResponse {
  teacherResponse: string;
  topicDetected: string;
  languageDetected: string;
  agentContributions: AgentContribution[];
}

export const AGENT_REGISTRY_MAP: Record<
  string,
  { id: string; name: string; role: 'teacher' | 'assistant' | 'student'; avatar: string; color: string; defaultTitle: string }
> = {
  'default-1': {
    id: 'default-1',
    name: 'AI Teacher',
    role: 'teacher',
    avatar: '/avatars/teacher.png',
    color: '#3b82f6',
    defaultTitle: 'Core Explanation',
  },
  'default-2': {
    id: 'default-2',
    name: 'AI Assistant',
    role: 'assistant',
    avatar: '/avatars/assist.png',
    color: '#10b981',
    defaultTitle: 'Practical Study Tip',
  },
  'default-3': {
    id: 'default-3',
    name: 'Class Clown',
    role: 'student',
    avatar: '/avatars/clown.png',
    color: '#f59e0b',
    defaultTitle: 'Humorous Analogy & Mnemonic',
  },
  'default-4': {
    id: 'default-4',
    name: 'Curious Mind',
    role: 'student',
    avatar: '/avatars/curious.png',
    color: '#ec4899',
    defaultTitle: 'Probing "What If?" Question',
  },
  'default-5': {
    id: 'default-5',
    name: 'Note Taker',
    role: 'student',
    avatar: '/avatars/note-taker.png',
    color: '#06b6d4',
    defaultTitle: 'Key Takeaways & Cheat Sheet',
  },
  'default-6': {
    id: 'default-6',
    name: 'Deep Thinker',
    role: 'student',
    avatar: '/avatars/thinker.png',
    color: '#8b5cf6',
    defaultTitle: 'First Principles & Deep Dive',
  },
};

export async function POST(req: NextRequest) {
  try {
    const body: any = await req.json();
    let messages: ChatMessage[] = body.messages;
    if (!messages && typeof body.message === 'string') {
      const trimmed = body.message.trim();
      if (trimmed) {
        messages = [{ role: 'user', content: trimmed }];
      } else {
        return NextResponse.json({ error: 'A non-empty message is required' }, { status: 400 });
      }
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0 || !messages[messages.length - 1]?.content?.trim()) {
      return NextResponse.json({ error: 'A non-empty message is required' }, { status: 400 });
    }

    const activeAgentIds: string[] = body.activeAgentIds || body.selectedAgentIds || ['default-1', 'default-2', 'default-3', 'default-5'];
    const latestUserMessage = messages[messages.length - 1]?.content || '';

    // Check which secondary agents are active
    let activeSecondaryAgents = activeAgentIds
      .filter((id) => id !== 'default-1' && AGENT_REGISTRY_MAP[id])
      .map((id) => AGENT_REGISTRY_MAP[id]);

    // If no secondary agents were selected, provide core multi-agent ensemble
    if (activeSecondaryAgents.length === 0) {
      activeSecondaryAgents = [
        AGENT_REGISTRY_MAP['default-5'], // Note Taker
        AGENT_REGISTRY_MAP['default-3'], // Class Clown
        AGENT_REGISTRY_MAP['default-2'], // AI Assistant
      ].filter(Boolean);
    }

    const GROQ_BASE_URL = process.env.OPENAI_BASE_URL || process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1';
    const GROQ_API_KEY = process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY || '';
    const modelToUse = body.model || 'qwen/qwen3.8-27b';

    const formattedConversation = messages
      .map((m) => `${m.role === 'user' ? 'Student' : 'AI Teacher'}: ${m.content}`)
      .join('\n\n');

    const secondaryAgentDescriptions = activeSecondaryAgents
      .map((a) => `- ${a.name} (${a.id}): Role: ${a.role}. Provides: ${a.defaultTitle}`)
      .join('\n');

    const systemPrompt = `You are the lead AI Teacher and Multi-Agent Orchestrator in OpenMAIC, an intelligent conversational classroom.
You converse with students naturally, warmly, and clearly just like ChatGPT, answering ANY question in ANY language requested.

CRITICAL INSTRUCTIONS:
1. LANGUAGE: Automatically respond in the SAME language the student uses (e.g. Odia, English, Hindi, Spanish, etc.). If the student speaks Odia, write natural, fluent spoken Odia with English technical terms in brackets (e.g. ଫୋଟୋସିନ୍ଥେସିସ୍ (photosynthesis)).
2. CONVERSATIONAL VERSATILITY:
   - If the student is having a casual conversation ("hi", "who are you?", "tell me about yourself"), respond warmly and conversationally.
   - If the student asks an academic, scientific, or conceptual question, explain it clearly with step-by-step structure, examples, and formatting.
3. MULTI-AGENT COLLABORATION:
   Along with the lead teacher's response, provide distinct contributions for these active secondary agents:
${secondaryAgentDescriptions}

You MUST reply with a valid JSON object strictly matching this schema:
{
  "topicDetected": "<Short topic name in 2-4 words, e.g. 'Photosynthesis in Plants', 'Newton's Laws', 'Casual Greeting'>",
  "languageDetected": "<e.g. 'Odia', 'English', 'Hindi', 'Spanish'>",
  "teacherResponse": "<The primary, rich markdown response from the AI Teacher in the student's language>",
  "agentContributions": [
    {
      "agentId": "<one of the active agent IDs: ${activeSecondaryAgents.map((a) => a.id).join(', ')}>",
      "title": "<Specific title for this agent's contribution>",
      "content": "<The contribution text in the conversation language:
         - For Note Taker (default-5): 2-4 clean bullet points or cheat-sheet summary.
         - For Class Clown (default-3): A witty, memorable real-life analogy or mnemonic.
         - For Curious Mind (default-4): A fascinating follow-up question or thought experiment.
         - For Deep Thinker (default-6): A deeper principle or counter-intuitive insight.
         - For AI Assistant (default-2): A practical study tip or common mistake to avoid.>"
    }
  ]
}

DO NOT wrap with markdown code fences. Output valid raw JSON only.`;

    let rawText = '';
    if (GROQ_API_KEY) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000);

        const response = await fetch(`${GROQ_BASE_URL.replace(/\/+$/, '')}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            model: modelToUse,
            messages: [
              { role: 'system', content: systemPrompt },
              {
                role: 'user',
                content: `Conversation:\n${formattedConversation}\n\nStudent: "${latestUserMessage}"\n\nGenerate JSON:`,
              },
            ],
            temperature: 0.4,
            max_tokens: 2500,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (response.ok) {
          const resData = await response.json();
          rawText = resData.choices?.[0]?.message?.content || '';
        } else {
          log.warn(`[Portal Chat] Provider returned status ${response.status}`);
        }
      } catch (fetchErr) {
        log.error('[Portal Chat] Error calling LLM provider:', fetchErr);
      }
    }

    // Parse the JSON response
    let parsedData: {
      teacherResponse?: string;
      topicDetected?: string;
      languageDetected?: string;
      agentContributions?: Array<{ agentId: string; title?: string; content?: string }>;
    } | null = null;

    if (rawText) {
      const cleanJson = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      try {
        parsedData = JSON.parse(cleanJson);
      } catch {
        // Attempt repairing unclosed braces if truncated
        const repairAttempts = [
          cleanJson,
          cleanJson + '"]}',
          cleanJson + '}]}',
          cleanJson + '"}',
          cleanJson + '}',
        ];
        for (const candidate of repairAttempts) {
          try {
            const start = candidate.indexOf('{');
            const end = candidate.lastIndexOf('}');
            if (start !== -1 && end > start) {
              parsedData = JSON.parse(candidate.substring(start, end + 1));
              break;
            }
          } catch {
            // try next
          }
        }

        // If still null, try extracting teacherResponse field via regex
        if (!parsedData) {
          const teacherMatch = rawText.match(/"teacherResponse"\s*:\s*"((?:[^"\\]|\\[\s\S])*)"/);
          if (teacherMatch && teacherMatch[1]) {
            try {
              const extractedTeacher = JSON.parse(`"${teacherMatch[1]}"`);
              parsedData = { teacherResponse: extractedTeacher };
            } catch {
              parsedData = { teacherResponse: teacherMatch[1].replace(/\\n/g, '\n') };
            }
          }
        }
      }
    }

    // Fallback if parsing failed or model was unavailable
    const isOdia = /[\u0B00-\u0B7F]/.test(latestUserMessage);
    const fallbackTeacherResponse =
      parsedData?.teacherResponse ||
      rawText ||
      (isOdia
        ? `ନମସ୍କାର! ମୁଁ ତୁମର ଶିକ୍ଷକ | "${latestUserMessage}" ବିଷୟରେ ବୁଝିବା ପାଇଁ ଆମେ ପ୍ରସ୍ତୁତ | ଏହା ବିଷୟରେ ବିସ୍ତୃତ ଆଲୋଚନା କରିବା |`
        : `Hello! I am your AI Teacher. Let's explore "${latestUserMessage}". I am here to help you master any subject with step-by-step clarity.`);

    const contributions: AgentContribution[] = [];

    // Map parsed contributions or generate defaults for active agents
    const rawAgentsList =
      parsedData?.agentContributions || (parsedData as any)?.agents || [];

    for (const agent of activeSecondaryAgents) {
      const found = rawAgentsList.find(
        (c: any) => c.agentId === agent.id || c.id === agent.id,
      );
      const text = found?.content || found?.contribution;
      if (found && text) {
        contributions.push({
          id: agent.id,
          agentId: agent.id,
          name: agent.name,
          agentName: agent.name,
          role: agent.role,
          avatar: agent.avatar,
          color: agent.color,
          title: found.title || agent.defaultTitle,
          content: text,
        });
      } else {
        // Provide intelligent persona-anchored fallback content
        let content = '';
        if (agent.id === 'default-5') {
          content = isOdia
            ? `📝 ମୁଖ୍ୟ ବିନ୍ଦୁ (Key Notes):\n• ମୌଳିକ ଧାରଣା ମନେ ରଖନ୍ତୁ\n• ପ୍ରମୁଖ ସୂତ୍ର ଓ ପରିଭାଷା ଅଭ୍ୟାସ କରନ୍ତୁ`
            : `📝 Key Takeaways:\n• Core principle and key definition\n• Practical application and exam focus`;
        } else if (agent.id === 'default-3') {
          content = isOdia
            ? `🎭 ମଜାଦାର ଉଦାହରଣ: ଏହାକୁ ଆମ ଦୈନନ୍ଦିନ ଜୀବନର ଏକ ସରଳ ଘଟଣା ସହିତ ତୁଳନା କରନ୍ତୁ !`
            : `🎭 Quick Analogy: Think of this like everyday life — simple once you connect the dots!`;
        } else if (agent.id === 'default-4') {
          content = isOdia
            ? `🤔 ଚିନ୍ତନ ପ୍ରଶ୍ନ: କ’ଣ ହୁଅନ୍ତା ଯଦି ଏହି ନିୟମ ଓଲଟା କାମ କରନ୍ତା?`
            : `🤔 Probing Question: What would happen if we changed the core conditions of this system?`;
        } else if (agent.id === 'default-6') {
          content = isOdia
            ? `💡 ଗଭୀର ବିଚାର: ଏହି ନିୟମର ମୂଳ କାରଣ କ’ଣ? ଏହାର ବ୍ୟାପକ ପ୍ରଭାବ କ’ଣ?`
            : `💡 Deep Insight: How does this connect to first principles and edge cases?`;
        } else if (agent.id === 'default-2') {
          content = isOdia
            ? `🤝 ଅଧ୍ୟୟନ ପରାମର୍ଶ: ପରୀକ୍ଷାରେ ଏହି ସାଧାରଣ ଭୁଲରୁ ଦୂରେଇ ରୁହନ୍ତୁ |`
            : `🤝 Study Tip: Watch out for common exam pitfalls when explaining this concept.`;
        }

        contributions.push({
          id: agent.id,
          agentId: agent.id,
          name: agent.name,
          agentName: agent.name,
          role: agent.role,
          avatar: agent.avatar,
          color: agent.color,
          title: agent.defaultTitle,
          content,
        });
      }
    }

    const finalTopic = parsedData?.topicDetected || (parsedData as any)?.topic || latestUserMessage.slice(0, 30);
    const finalLang = parsedData?.languageDetected || (parsedData as any)?.detectedLanguage || (isOdia ? 'Odia' : 'English');

    const responsePayload = {
      success: true,
      teacherResponse: fallbackTeacherResponse,
      topicDetected: finalTopic,
      languageDetected: finalLang,
      topic: finalTopic,
      detectedLanguage: finalLang,
      agentContributions: contributions,
    };

    return NextResponse.json(responsePayload);
  } catch (error) {
    log.error('Fatal error in /api/portal/chat:', error);
    return NextResponse.json(
      {
        error: 'Failed to process chat',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
