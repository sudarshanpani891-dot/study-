import { describe, it, expect } from 'vitest';
import { buildMatiSathiGraph, runMatiSathiWorkflow } from '@/lib/matisathi/graph';

describe('MatiSathi Deterministic LangGraph Workflow', () => {
  it('compiles LangGraph StateGraph without errors', () => {
    const graph = buildMatiSathiGraph();
    expect(graph).toBeDefined();
    expect(typeof graph.invoke).toBe('function');
  });

  it('executes full 7-node pipeline and logs complete decision trace for student doubt', async () => {
    const doubtQuery = 'ଉଦ୍ଭିଦ କୋଷ ପ୍ରାଚୀର (Cell Wall) ଏବଂ କୋଷ ଝିଲ୍ଲୀ (Cell Membrane) ମଧ୍ୟରେ ପାର୍ଥକ୍ୟ କ’ଣ?';

    const result = await runMatiSathiWorkflow({
      query: doubtQuery,
      inputMode: 'voice',
    });

    expect(result).toBeDefined();
    expect(result.detectedSubject).toBe('Science');
    expect(result.detectedTopicEnglish).toContain('Cell Wall');
    expect(result.explanationOdia).toBeDefined();
    expect(result.explanationOdia.length).toBeGreaterThan(10);
    expect(result.englishKeywords).toBeDefined();
    expect(result.englishKeywords.length).toBeGreaterThan(0);

    // Verify Decision Trace
    const trace = result.decisionTrace;
    expect(trace).toBeDefined();
    expect(trace.length).toBe(7);

    // Verify step sequence and tool calls
    const stepNames = trace.map((s) => s.nodeName);
    expect(stepNames).toEqual([
      'ingest_query',
      'retrieve_curriculum',
      'diagnose_misconception',
      'update_mastery',
      'decide_pedagogy',
      'generate_response',
      'proactive_followup',
    ]);

    // Check Tool calls are explicitly logged
    const toolSteps = trace.filter((s) => s.actionType === 'tool_call');
    expect(toolSteps.length).toBeGreaterThanOrEqual(3);

    const curriculumToolStep = trace.find((s) => s.nodeName === 'retrieve_curriculum');
    expect(curriculumToolStep?.toolName).toBe('searchCurriculumKB');
    expect(curriculumToolStep?.toolInput).toBeDefined();
    expect(curriculumToolStep?.toolOutput).toBeDefined();
    expect(curriculumToolStep?.reasoningOdia).toContain('ପାଠ୍ୟଖସଡ଼ା');

    const masteryToolStep = trace.find((s) => s.nodeName === 'update_mastery');
    expect(masteryToolStep?.toolName).toBe('updateMasteryMatrix');
    expect(masteryToolStep?.toolOutput).toHaveProperty('newScore');

    const proactiveToolStep = trace.find((s) => s.nodeName === 'proactive_followup');
    expect(proactiveToolStep?.toolName).toBe('scheduleProactiveNudge');
    expect(result.proactiveNudge).toBeDefined();
    expect(result.proactiveNudge?.challengeQuestionOdia).toBeDefined();
  }, 15000);

  it('detects student misconception and logs diagnostic finding', async () => {
    const misconceptionQuery = 'Does an animal cell wall protect it from rain?';

    const result = await runMatiSathiWorkflow({
      query: misconceptionQuery,
      inputMode: 'text',
    });

    expect(result.misconceptionFound).toBe(true);
    expect(result.selectedStrategy).toBe('rural_analogy');

    const diagStep = result.decisionTrace.find((s) => s.nodeName === 'diagnose_misconception');
    expect(diagStep).toBeDefined();
    expect(diagStep?.reasoning).toContain('entrenched misconception');
  }, 15000);

  it('autonomously plans, generates tasks, and allocates future review for arbitrary universal topics', async () => {
    const universalQuery = 'How does Bernoulli principle help aeroplanes fly in the sky? Explain lift force.';

    const result = await runMatiSathiWorkflow({
      query: universalQuery,
      inputMode: 'text',
    });

    expect(result).toBeDefined();
    expect(result.detectedSubject).toBeDefined();
    expect(result.explanationOdia).toBeDefined();
    expect(result.explanationEnglish).toBeDefined();

    // Verify 4-stage autonomous learning plan
    expect(result.learningPlan).toBeDefined();
    expect(result.learningPlan?.goalSummaryOdia).toBeDefined();
    expect(result.learningPlan?.goalSummaryEnglish).toBeDefined();
    expect(result.learningPlan?.stages.length).toBeGreaterThanOrEqual(3);
    expect(result.learningPlan?.allocatedNextReviewDate).toBeDefined();

    // Verify interactive quiz challenge
    expect(result.interactiveChallenge).toBeDefined();
    expect(result.interactiveChallenge?.questionOdia).toBeDefined();
    expect(result.interactiveChallenge?.questionEnglish).toBeDefined();
    expect(result.interactiveChallenge?.options.length).toBe(4);
    const correctOptions = result.interactiveChallenge?.options.filter((o) => o.isCorrect);
    expect(correctOptions?.length).toBe(1);

    // Verify hands-on action task
    expect(result.actionTask).toBeDefined();
    expect(result.actionTask?.titleOdia).toBeDefined();
    expect(result.actionTask?.instructionsOdia).toBeDefined();
    expect(result.actionTask?.expectedOutcomeOdia).toBeDefined();
  }, 25000);
});
