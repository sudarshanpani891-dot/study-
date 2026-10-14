import { describe, it, expect } from 'vitest';
import { runMatiSathiWorkflow } from '@/lib/matisathi/graph';
import { fetchLiveInternetKnowledge } from '@/lib/matisathi/web-knowledge';

describe('MatiSathi Universal Topic & Live Internet Knowledge Tests', () => {
  it('fetches real Wikipedia internet knowledge accurately', async () => {
    const knowledge = await fetchLiveInternetKnowledge('photosynthesis');
    expect(knowledge).toBeDefined();
    expect(knowledge.success).toBe(true);
    expect(knowledge.topicTitle.toLowerCase()).toContain('photosynthesis');
    expect(knowledge.extract.toLowerCase()).toContain('light');
  });

  it('answers specifically for Photosynthesis without defaulting to cell membrane', async () => {
    const result = await runMatiSathiWorkflow({
      query: 'What is photosynthesis and how do green leaves make food?',
      inputMode: 'text',
    });

    expect(result).toBeDefined();
    // Verify topic is specifically about photosynthesis
    expect(result.detectedTopicEnglish.toLowerCase()).toContain('photosynthesis');
    expect(result.explanationEnglish.toLowerCase()).toContain('photosynthesis');

    // Verify explanation does not talk about cell wall vs cell membrane
    expect(result.explanationEnglish.toLowerCase()).not.toContain('cell wall vs cell membrane');

    // Verify quiz question is about photosynthesis
    expect(result.interactiveChallenge).toBeDefined();
    expect(result.interactiveChallenge?.questionEnglish.toLowerCase()).toMatch(/photosynthesis|green leaf|plant|food/i);
    expect(result.interactiveChallenge?.options.length).toBe(4);
    const correctOptions = result.interactiveChallenge?.options.filter((o) => o.isCorrect);
    expect(correctOptions?.length).toBe(1);

    // Verify learning plan and review are about photosynthesis
    expect(result.learningPlan?.goalSummaryEnglish.toLowerCase()).toContain('photosynthesis');
    expect(result.proactiveNudge?.topicNameEnglish.toLowerCase()).toContain('photosynthesis');
  }, 25000);

  it('answers specifically for Electric Motors without defaulting to cell membrane', async () => {
    const result = await runMatiSathiWorkflow({
      query: 'How does an electric motor convert electricity to mechanical motion?',
      inputMode: 'text',
    });

    expect(result).toBeDefined();
    expect(result.detectedTopicEnglish.toLowerCase()).toMatch(/motor|electric/i);
    expect(result.explanationEnglish.toLowerCase()).toMatch(/motor|mechanical|current|magnetic/i);

    // Absolutely no cell wall or membrane
    expect(result.explanationEnglish.toLowerCase()).not.toContain('cell wall');
    expect(result.explanationEnglish.toLowerCase()).not.toContain('cell membrane');

    // Quiz is about electric motor
    expect(result.interactiveChallenge?.questionEnglish.toLowerCase()).toMatch(/motor|electric|magnetic|energy/i);
    expect(result.interactiveChallenge?.options.length).toBe(4);

    // Next scheduled review is about electric motor
    expect(result.proactiveNudge?.topicNameEnglish.toLowerCase()).toMatch(/motor|electric/i);
  }, 25000);
});
