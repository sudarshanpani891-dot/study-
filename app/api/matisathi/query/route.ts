/**
 * MatiSathi Query API Endpoint
 * POST /api/matisathi/query
 * Executes the Multi-Agent Supervisor Orchestrator (Step 3)
 * for a student doubt and returns the AI response with complete decision trace.
 */

import { NextRequest, NextResponse } from 'next/server';
import { learnerPool } from '@/lib/server/learner/http';
import { resolveLearnerId } from '@/lib/server/learner/identity';
import { getLearner, listConcepts } from '@/lib/server/learner/repository';
import {
  buildInitialMultiAgentState,
  createMultiAgentSupervisorGraph,
} from '@/lib/orchestration/tutor/supervisor-graph';
import type { AgentDoubtResponse, DoubtQueryRequest } from '@/lib/matisathi/types';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { learnerId } = resolveLearnerId(req);

    let body: (DoubtQueryRequest & { language?: string; studentId?: string; portal?: string }) | null = null;
    try {
      const text = await req.text();
      if (!text || !text.trim()) {
        return NextResponse.json(
          { error: 'queryText is required and must be a string' },
          { status: 400 },
        );
      }
      try {
        body = JSON.parse(text);
      } catch {
        const { jsonrepair } = await import('jsonrepair');
        body = JSON.parse(jsonrepair(text));
      }
    } catch (parseErr) {
      return NextResponse.json(
        { error: 'Malformed JSON payload', details: String(parseErr) },
        { status: 400 },
      );
    }

    if (!body || !body.queryText || typeof body.queryText !== 'string') {
      return NextResponse.json(
        { error: 'queryText is required and must be a string' },
        { status: 400 },
      );
    }

    const pool = await learnerPool();
    const learner = await getLearner(pool, learnerId);
    const language = body.language || learner?.language || 'or-IN';
    const isOdia = language === 'or-IN' || language.startsWith('or');

    const turnId = `turn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const initialState = buildInitialMultiAgentState({
      turnId,
      learnerId,
      query: body.queryText,
      inputMode: body.inputMode || 'text',
      language,
      portal: body.portal || 'matisathi',
      learnerProfile: learner
        ? {
            id: learner.id,
            name: learner.name,
            grade: learner.grade,
            board: learner.board || 'BSE Odisha',
            language: learner.language,
            daily_minutes: learner.dailyMinutes || 60,
            exam_date: learner.examDate,
          }
        : undefined,
      queryable: pool,
    });

    const graph = createMultiAgentSupervisorGraph();
    const finalState = await graph.invoke(initialState);

    const concept = finalState.detectedConcept;
    const lesson = finalState.lesson;
    const plan = finalState.plan;
    const practice = finalState.practice;
    const followups = finalState.followups;

    // Map 3 questions into interactive challenge structure
    const mcqQuestions = practice.questions.filter((q) => q.type === 'mcq');
    const firstMcq = mcqQuestions[0];

    const explanationOdiaText =
      lesson.text ||
      (isOdia
        ? `${concept.nameOr} ବିଷୟରେ ମୁଖ୍ୟ ତଥ୍ୟ: ${plan.reasonLocalized || plan.reason}`
        : `${concept.nameEn}: ${plan.reason}`);

    const explanationEnglishText =
      lesson.textEnglish || `${concept.nameEn}: ${plan.reason}`;

    let allConcepts: Array<{ id: string; nameOr: string; nameEn: string; subject: string; chapter: string }> = [];
    try {
      allConcepts = await listConcepts(pool);
    } catch {
      // fallback
    }
    const conceptMap = new Map(allConcepts.map((c) => [c.id, c]));

    const todayPlanItems = finalState.plan.todayPlanItems || [];
    const nextStudyRecommendations = [
      {
        conceptId: concept.id,
        topicNameOdia: concept.nameOr,
        topicNameEnglish: concept.nameEn,
        reasonOdia: isOdia
          ? 'ଏହି ପ୍ରଶ୍ନର ଅଭ୍ୟାସ ସମ୍ପୂର୍ଣ୍ଣ କରନ୍ତୁ ଏବଂ ମୁଖ୍ୟ ବିଷୟବସ୍ତୁକୁ ଦୃଢ଼ କରନ୍ତୁ (+10 XP)'
          : 'Complete practice challenge to solidify concept mastery (+10 XP)',
        reasonEnglish: 'Complete practice challenge to solidify concept mastery (+10 XP)',
        estimatedMinutes: 15,
        timing: 'Today',
      },
      ...todayPlanItems
        .filter((item) => item.conceptId !== concept.id)
        .slice(0, 2)
        .map((item) => {
          const c = conceptMap.get(item.conceptId);
          return {
            conceptId: item.conceptId,
            topicNameOdia: c?.nameOr || item.conceptId,
            topicNameEnglish: c?.nameEn || item.conceptId,
            reasonOdia: item.reason,
            reasonEnglish: item.reason,
            estimatedMinutes: item.minutes || 20,
            timing: item.scheduledDate === new Date().toISOString().split('T')[0] ? 'Today' : 'Tomorrow',
          };
        }),
    ];

    const response: AgentDoubtResponse = {
      doubtId: turnId,
      queryText: body.queryText,
      detectedSubject: concept.subject || 'Science',
      detectedTopicOdia: concept.nameOr || concept.id,
      detectedTopicEnglish: concept.nameEn || concept.id,
      prerequisites: concept.prerequisites || [],
      explanationOdia: explanationOdiaText,
      explanationEnglish: explanationEnglishText,
      englishKeywords: (lesson.technicalTerms || []).map((t) => t.inEnglish),
      ruralMetaphorUsed: {
        metaphorTitleOdia: 'ଗ୍ରାମୀଣ ଉଦାହରଣ (Rural Analogy)',
        explanationOdia:
          lesson.analogyOrExample ||
          (isOdia
            ? 'ଏହି ଧାରଣାକୁ ଆମ ଗାଁ ଓ ଦୈନନ୍ଦିନ ପରିବେଶ ସହ ତୁଳନା କରାଯାଇଛି |'
            : 'This principle connects directly to everyday observation.'),
        scientificLinkOdia: plan.reasonLocalized || plan.reason,
      },
      learningPlan: {
        currentMasteryScore: Math.round(finalState.masterySnapshot.score * 100),
        goalSummaryOdia: plan.reasonLocalized || plan.reason,
        goalSummaryEnglish: plan.reason,
        pedagogicalGoalOdia: plan.reasonLocalized || plan.reason,
        pedagogicalGoalEnglish: plan.reason,
        stages: [
          {
            stageNumber: 1,
            titleOdia: 'ସନ୍ଦେହ ନିଦାନ (Diagnosis)',
            titleEnglish: 'Doubt Diagnosis',
            descriptionOdia: 'ପ୍ରଶ୍ନ ଓ ପୂର୍ବ ଜ୍ଞାନର ଆକଳନ',
            descriptionEnglish: 'Assessing prior knowledge and knowledge gaps',
            status: 'completed',
          },
          {
            stageNumber: 2,
            titleOdia: 'ମାଇକ୍ରୋ-ଲେସନ୍ ଓ ଗ୍ରାମୀଣ ଉଦାହରଣ',
            titleEnglish: 'Micro-Lesson & Rural Analogy',
            descriptionOdia: 'ଦୈନନ୍ଦିନ ଜୀବନର ଉଦାହରଣ ସହ ଧାରଣା ସ୍ପଷ୍ଟିକରଣ',
            descriptionEnglish: 'Concept clarity with familiar local context',
            status: 'completed',
          },
          {
            stageNumber: 3,
            titleOdia: 'ପ୍ରାକ୍ଟିସ୍ ଓ ଆକଳନ (Targeted Practice)',
            titleEnglish: 'Targeted Practice Challenge',
            descriptionOdia: '୩ଟି ପରୀକ୍ଷାମୂଳକ ପ୍ରଶ୍ନର ଅଭ୍ୟାସ',
            descriptionEnglish: 'Solve targeted diagnostic challenges',
            status: 'in_progress',
          },
          {
            stageNumber: 4,
            titleOdia: 'ସ୍ପେସ୍ଡ୍ ଫଲୋ-ଅପ୍ (Spaced Review)',
            titleEnglish: 'Spaced Follow-up Review',
            descriptionOdia: 'ପରବର୍ତ୍ତୀ ସମୀକ୍ଷା ଓ ସ୍ଥାୟୀ ସ୍ମୃତି',
            descriptionEnglish: 'Reinforce memory at optimal retention interval',
            status: 'upcoming',
          },
        ],
        allocatedNextReviewDate: followups.scheduledFollowup?.dueAt || 'Tomorrow @ 07:00 PM',
        followupChallengePromptOdia:
          followups.dueFollowupHook ||
          `କାଲି ତମେ "${concept.nameOr}" ପଢ଼ିଥିଲ — ଏବେ ଗୋଟିଏ ପ୍ରଶ୍ନ ଚେଷ୍ଟା କରିବା?`,
        followupChallengePromptEnglish: `Follow up on ${concept.nameEn}`,
        nextStudyRecommendations,
      },
      interactiveChallenge: firstMcq
        ? {
            id: firstMcq.id,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            conceptTested: concept.id as any,
            questionOdia: firstMcq.questionText,
            questionEnglish: firstMcq.questionText,
            options: (firstMcq.options || []).map((opt) => {
              const isCorrect =
                String(opt.id).toLowerCase() === String(firstMcq.correctOptionId).toLowerCase();
              return {
                id: opt.id,
                textOdia: opt.text,
                textEnglish: opt.text,
                isCorrect,
                explanationOdia: isCorrect
                  ? firstMcq.rubricHint || 'ସଠିକ୍ ଉତ୍ତର! ଅତି ଉତ୍ତମ |'
                  : 'ଏହା ସଠିକ୍ ନୁହେଁ, ପୁନର୍ବାର ଚେଷ୍ଟା କରନ୍ତୁ |',
                explanationEnglish: isCorrect
                  ? firstMcq.rubricHint || 'Correct answer! Great job.'
                  : 'Not quite. Review the concept and try again.',
              };
            }),
            difficulty: 'medium',
          }
        : undefined,
      actionTask: {
        id: `task_${concept.id}`,
        titleOdia: `ହାତପାହାନ୍ତା ଅନୁସନ୍ଧାନ: ${concept.nameOr}`,
        titleEnglish: `Hands-on Task: ${concept.nameEn}`,
        instructionsOdia:
          lesson.analogyOrExample ||
          'ଏହି ଧାରଣାକୁ ଆପଣଙ୍କ ଘରେ ବା ଆଖପାଖରେ ପରୀକ୍ଷଣ କରି ଦେଖନ୍ତୁ |',
        instructionsEnglish: `Observe this principle around you: ${concept.nameEn}`,
        expectedOutcomeOdia: 'ବାସ୍ତବ ଜୀବନ ସହ ବୈଜ୍ଞାନିକ ଧାରଣାର ସଂଯୋଗ |',
        expectedOutcomeEnglish: 'Connecting scientific theory to real-world observation.',
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      allPracticeQuestions: practice.questions as any,
      masteryDelta: 15,
      updatedMasteryScore: Math.round(finalState.masterySnapshot.score * 100),
      pedagogicalStrategy: plan.action,
      proactiveNextStep: {
        topicNameOdia: concept.nameOr,
        topicNameEnglish: concept.nameEn,
        promptOdia:
          followups.dueFollowupHook ||
          `${concept.nameOr} ବିଷୟରେ ଅଭ୍ୟାସ ଜାରି ରଖିବା କି?`,
        promptEnglish: `Ready to practice ${concept.nameEn}?`,
        conceptId: concept.id,
        scheduledFor: followups.scheduledFollowup?.dueAt,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      decisionTrace: finalState.traces as any,
      source: 'groq_ai',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[MatiSathi Query API] Multi-agent supervisor execution error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process doubt',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
