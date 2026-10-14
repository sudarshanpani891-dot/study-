import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/portal/chat/route';

describe('Portal Chat Multi-Agent API (/api/portal/chat)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.OPENAI_API_KEY = 'test-mock-api-key';
  });

  it('rejects empty messages with 400 status', async () => {
    const req = new Request('http://localhost:3000/api/portal/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '   ' }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toBe('A non-empty message is required');
  });

  it('handles valid multi-agent conversation requests and formats agents appropriately', async () => {
    // Mock the external LLM fetch call to return a structured multi-agent response
    const mockApiResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              topic: 'Photosynthesis',
              detectedLanguage: 'English',
              teacherResponse:
                '### Understanding Photosynthesis\n\nPhotosynthesis is the biological process by which green plants synthesize nutrients from carbon dioxide and water using sunlight energy captured by chlorophyll.\n\n$$\\text{6CO}_2 + 6\\text{H}_2\\text{O} + \\text{light} \\rightarrow \\text{C}_6\\text{H}_{12}\\text{O}_6 + 6\\text{O}_2$$',
              agents: [
                {
                  id: 'default-5',
                  name: 'Note Taker',
                  title: 'Formula Cheat-Sheet',
                  avatar: '/avatar/student-d.png',
                  color: 'emerald',
                  contribution:
                    '**Key Formula:** 6CO₂ + 6H₂O + Sunlight ➔ C₆H₁₂O₆ + 6O₂.\n**Site:** Chloroplast (Thylakoids & Stroma).',
                },
                {
                  id: 'default-3',
                  name: 'Class Clown',
                  title: 'Kitchen Analogy',
                  avatar: '/avatar/student-b.png',
                  color: 'amber',
                  contribution:
                    'Think of plants as solar-powered chefs! They don’t order Swiggy; they just sunbathe and turn rays into glucose cookies!',
                },
              ],
            }),
          },
        },
      ],
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiResponse,
    } as any);

    const req = new Request('http://localhost:3000/api/portal/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'How does photosynthesis work?',
        selectedAgentIds: ['default-5', 'default-3'],
      }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.topic).toBe('Photosynthesis');
    expect(data.detectedLanguage).toBe('English');
    expect(data.teacherResponse).toContain('Understanding Photosynthesis');
    expect(data.agentContributions).toHaveLength(2);

    expect(data.agentContributions[0].name).toBe('Note Taker');
    expect(data.agentContributions[0].id).toBe('default-5');
    expect(data.agentContributions[1].name).toBe('Class Clown');
    expect(data.agentContributions[1].id).toBe('default-3');

    expect(fetchSpy).toHaveBeenCalled();
  });

  it('gracefully handles markdown-wrapped JSON or partial JSON responses from LLM', async () => {
    // LLMs often return ```json ... ``` code blocks
    const rawContent = `\`\`\`json
{
  "topic": "Gravity",
  "detectedLanguage": "English",
  "teacherResponse": "Gravity is the fundamental interaction causing mutual attraction between all things with mass.",
  "agents": [
    {
      "id": "default-6",
      "name": "Deep Thinker",
      "title": "Einsteinian Perspective",
      "avatar": "/avatar/student-c.png",
      "color": "indigo",
      "contribution": "In general relativity, gravity is not a Newtonian force at a distance, but the curvature of spacetime caused by mass-energy."
    }
  ]
}
\`\`\``;

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: rawContent } }],
      }),
    } as any);

    const req = new Request('http://localhost:3000/api/portal/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Why do things fall?',
        selectedAgentIds: ['default-6'],
      }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.topic).toBe('Gravity');
    expect(data.agentContributions[0].name).toBe('Deep Thinker');
  });

  it('falls back to rule-based multi-agent answers when upstream LLM fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error or rate limit'));

    const req = new Request('http://localhost:3000/api/portal/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Tell me about cells',
        selectedAgentIds: ['default-5', 'default-4'],
      }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.teacherResponse).toBeDefined();
    expect(data.agentContributions.length).toBeGreaterThan(0);
  });
});
