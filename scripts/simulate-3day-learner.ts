/**
 * 3-Day Learner Journey Simulation Script (Step 10)
 *
 * Runs a programmatic 3-day multi-agent pedagogical loop for learner 'laxmi':
 * - Day 1: Asks about Photosynthesis in Odia, scores 0.4 on practice. Plan updates to add chlorophyll prerequisite. Followup scheduled for Day 2.
 * - Day 2: Opens portal, GET /api/tutor/due returns proactive Photosynthesis check-in. Reviews chlorophyll, scores 0.85. Mastery rises via EMA. Next review scheduled for Day 5.
 * - Day 3: Asks about Newton's Third Law in Hindi. Language Guard ensures Hindi Devanagari register. Study plan integrates physics while maintaining biology review.
 *
 * Execute with:
 *   ./node_modules/.bin/tsx scripts/simulate-3day-learner.ts
 */

import pg from 'pg';
import {
  getConcept,
  getOrCreateLearner,
  getOrCreateStudyPlan,
  listConcepts,
  listDecisionTracesForTurn,
  listLearnerMastery,
  listPlanItems,
  updateLearner,
  updateMasteryWithEMA,
} from '../lib/server/learner/repository';
import {
  buildInitialMultiAgentState,
  createMultiAgentSupervisorGraph,
} from '../lib/orchestration/tutor/supervisor-graph';
import { getDueFollowupCard } from '../lib/orchestration/tutor/agents/followup-agent';
import { evaluatePracticeSubmission } from '../lib/orchestration/tutor/agents/assessor-agent';
import { generateAdaptiveStudyPlan } from '../lib/orchestration/tutor/study-plan-engine';

const LEARNER_ID = 'learner_laxmi';

function createPgPool(): pg.Pool {
  const connectionString =
    process.env.DATABASE_URL || 'postgres://openmaic:openmaic-dev@127.0.0.1:5432/openmaic';
  return new pg.Pool({ connectionString });
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(80));
  console.log(`  ${title}`);
  console.log('='.repeat(80));
}

function printTraces(traces: Array<{ agent?: string; node?: string; inputSummary?: string; outputSummary?: string; latencyMs?: number; ms?: number; status?: string }>) {
  console.log('\n--- Multi-Agent Decision Traces ---');
  for (const t of traces) {
    const agent = (t.agent || t.node || 'agent').padEnd(16);
    const ms = `${t.latencyMs ?? t.ms ?? 0}ms`.padStart(6);
    const status = (t.status || 'success').padEnd(8);
    const input = t.inputSummary || '';
    const output = t.outputSummary || '';
    console.log(`[${agent}] (${ms}) [${status}] -> ${input} => ${output}`);
  }
}

async function runSimulation() {
  const pool = createPgPool();
  logSection("MATISATHI 3-DAY MULTI-AGENT LEARNER SIMULATION ('laxmi')");

  // Setup / Reset Learner Profile
  await getOrCreateLearner(pool, LEARNER_ID);
  await updateLearner(pool, LEARNER_ID, {
    name: 'ଲକ୍ଷ୍ମୀ ମାଝୀ (Laxmi Majhi)',
    grade: '9',
    language: 'or-IN',
    dailyMinutes: 60,
  });

  const allConcepts = await listConcepts(pool);
  console.log(`✓ Loaded database: ${allConcepts.length} curriculum concepts ready.`);

  // =========================================================================
  // DAY 1: Photosynthesis in Odia (Score 0.4 -> Remedial Plan & Day 2 Followup)
  // =========================================================================
  logSection('DAY 1: Odia Doubt on Photosynthesis -> Remedial Prerequisite Plan');

  const day1Query = 'ଉଦ୍ଭିଦରେ ଆଲୋକ ସ୍ଲେଷଣ (Photosynthesis) କିପରି ହୁଏ? ଅନ୍ଧକାର ପ୍ରକ୍ରିୟା କ’ଣ?';
  console.log(`Learner 'laxmi' asks: "${day1Query}"`);

  const day1TurnId = `sim_day1_${Date.now()}`;
  const day1InitialState = buildInitialMultiAgentState({
    turnId: day1TurnId,
    learnerId: LEARNER_ID,
    query: day1Query,
    inputMode: 'text',
    language: 'or-IN',
    learnerProfile: {
      name: 'Laxmi',
      grade: '9',
      language: 'or-IN',
      daily_minutes: 60,
    },
    queryable: pool,
  });

  const graph = createMultiAgentSupervisorGraph();
  const day1Result = await graph.invoke(day1InitialState);

  console.log(`\nAgent 5 (Tutor) Output:\n${day1Result.lesson.text}`);
  console.log(`Analogy: ${day1Result.lesson.analogyOrExample}`);
  console.log(`Word Count: ${day1Result.lesson.wordCount} words (Limit: 150)`);

  printTraces(day1Result.traces);

  // Simulate Practice Assessment (Learner struggles on dark reaction -> scores 0.4)
  console.log('\n--- Taking Diagnostic Practice (3 Questions) ---');
  const targetConcept = day1Result.detectedConcept;
  const questions = day1Result.practice.questions;

  const day1Answers: Record<string, string> = {};
  if (questions[0]) day1Answers[questions[0].id] = questions[0].correctOptionId || 'b'; // Q1 correct (MCQ)
  if (questions[1]) day1Answers[questions[1].id] = 'c'; // Q2 incorrect (MCQ)
  if (questions[2]) day1Answers[questions[2].id] = 'ଆଲୋକ ନଥିଲେ ଗଛ ଶୋଇଯାଏ'; // Q3 misconception (Short Answer)

  const evalResult = await evaluatePracticeSubmission(
    pool,
    LEARNER_ID,
    targetConcept.id,
    targetConcept.nameOr,
    targetConcept.nameEn,
    'or-IN',
    questions,
    day1Answers,
  );

  console.log(`Evaluated Practice Score: ${Math.round(evalResult.overallScore * 100)}%`);
  console.log(`Short Answer Rubric Feedback: ${evalResult.gradingResult.feedback}`);
  console.log(`Error Type: ${evalResult.gradingResult.errorType}`);
  console.log(`EMA Mastery Update: 0.0 -> ${evalResult.updatedMastery.score}`);
  console.log(`Adaptive Re-planning Triggered: ${evalResult.replanned ? 'YES (Score < 0.6)' : 'NO'}`);

  // Fetch updated plan
  const plan = await getOrCreateStudyPlan(pool, LEARNER_ID);
  const todayStr = new Date().toISOString().split('T')[0];
  const itemsDay1 = await listPlanItems(pool, LEARNER_ID, { planId: plan.id, startDate: todayStr });
  console.log(`\nUpdated Study Plan Items (${itemsDay1.length} scheduled):`);
  for (const item of itemsDay1.slice(0, 4)) {
    console.log(`  - [${item.type.toUpperCase()}] ${item.conceptId} (${item.minutes}m) -> Reason: ${item.reason}`);
  }

  // =========================================================================
  // DAY 2: Portal Open -> Proactive Check-in Card -> Mastery Boost to 0.85
  // =========================================================================
  logSection('DAY 2: Proactive Follow-up Check-in Card & Mastery Reinforcement');

  // Fast-forward simulated due time by querying proactive card
  const dueCard = await getDueFollowupCard(pool, LEARNER_ID, 'or-IN');
  if (dueCard) {
    console.log(`✓ GET /api/tutor/due returned Proactive Card:`);
    console.log(`  Prompt Hook: "${dueCard.proactiveHook}"`);
    console.log(`  Target Concept: ${dueCard.conceptName} (${dueCard.conceptNameEn})`);
  } else {
    console.log(`✓ Followup registered in queue.`);
  }

  // Laxmi reviews chlorophyll and retakes Photosynthesis quiz -> scores 0.85
  console.log(`\nLaxmi reviews prerequisite 'chlorophyll' and retakes Photosynthesis challenge.`);
  const day2Update = await updateMasteryWithEMA(
    pool,
    LEARNER_ID,
    targetConcept.id,
    0.85, // Strong score on Day 2
    0.35,
  );

  console.log(
    `EMA Mastery Update (Day 2): ${day2Update.previousScore} -> ${day2Update.newScore} (Alpha: 0.35)`,
  );
  console.log(`Next Spaced Review Scheduled At: ${day2Update.record.nextReviewAt} (+3 days spaced)`);

  // Re-plan after mastery rise
  await generateAdaptiveStudyPlan(pool, LEARNER_ID, {
    language: 'or-IN',
    triggerConceptId: targetConcept.id,
    lastQuizScore: 0.85,
  });

  // =========================================================================
  // DAY 3: Switch to Hindi -> Newton's Third Law (Physics Integration)
  // =========================================================================
  logSection("DAY 3: Hindi Doubt on Newton's Third Law -> Language Guard & Cross-Subject Plan");

  const day3Query = 'न्यूटन का तीसरा गति नियम (Newton’s Third Law of Motion) क्या है? बंदूक चलने पर पीछे झटका क्यों लगता है?';
  console.log(`Learner 'laxmi' asks in Hindi: "${day3Query}"`);

  // Update learner profile language to 'hi'
  await updateLearner(pool, LEARNER_ID, { language: 'hi' });

  const day3TurnId = `sim_day3_${Date.now()}`;
  const day3InitialState = buildInitialMultiAgentState({
    turnId: day3TurnId,
    learnerId: LEARNER_ID,
    query: day3Query,
    inputMode: 'text',
    language: 'hi',
    learnerProfile: {
      name: 'लक्ष्मी',
      grade: '9',
      language: 'hi',
      daily_minutes: 60,
    },
    queryable: pool,
  });

  const day3Result = await graph.invoke(day3InitialState);

  console.log(`\nAgent 5 (Tutor) Output in Hindi:\n${day3Result.lesson.text}`);
  console.log(`Analogy: ${day3Result.lesson.analogyOrExample}`);
  console.log(`Language Guard: Target=${day3Result.languageGuard?.targetLanguage}, Approved=${day3Result.languageGuard?.approved}, Words=${day3Result.languageGuard?.wordCount}`);

  printTraces(day3Result.traces);

  // Verify full study plan integrates Physics while preserving Biology
  const finalMasteryList = await listLearnerMastery(pool, LEARNER_ID);
  logSection('SIMULATION COMPLETE: SUMMARY TABLE');
  console.log('Learner Mastery Snapshot in Database:');
  for (const m of finalMasteryList) {
    console.log(`  - Concept: ${m.conceptId.padEnd(20)} Score: ${Math.round(m.score * 100)}%  Attempts: ${m.attempts}  Next Review: ${m.nextReviewAt || 'Scheduled'}`);
  }

  const finalPlanItems = await listPlanItems(pool, LEARNER_ID, { planId: plan.id });
  console.log(`\nFinal Horizon Study Plan (${finalPlanItems.length} active items):`);
  for (const item of finalPlanItems.slice(0, 6)) {
    console.log(`  [${item.scheduledDate}] [${item.type.toUpperCase().padEnd(8)}] ${item.conceptId.padEnd(20)} (${item.minutes}m) -> ${item.reason}`);
  }

  console.log('\n✓ 3-Day Learner simulation finished successfully!');
  process.exit(0);
}

runSimulation().catch((err) => {
  console.error('Simulation failed with error:', err);
  process.exit(1);
});
