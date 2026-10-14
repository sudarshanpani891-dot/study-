/**
 * POST /api/practice/submit
 * Practice Answer Evaluation & EMA Mastery Update (Step 5 & Step 9)
 * Evaluates MCQ deterministically, grades short answers via LLM rubric,
 * updates mastery via EMA (alpha = 0.35), and triggers adaptive study plan re-route if score < 0.6.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { isServerPersistenceConfigured } from '@/lib/config/feature-flags';
import {
  learnerDbUnavailableResponse,
  learnerJsonError,
  learnerPool,
  parseJsonBody,
} from '@/lib/server/learner/http';
import { withLearner } from '@/lib/server/learner/identity';
import { getConcept, getLearner, recordDecisionTrace } from '@/lib/server/learner/repository';
import { evaluatePracticeSubmission } from '@/lib/orchestration/tutor/agents/assessor-agent';
import type { PracticeQuestion } from '@/lib/orchestration/tutor/state';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!isServerPersistenceConfigured()) {
    return learnerDbUnavailableResponse();
  }

  return withLearner(req, async ({ learnerId }, headers) => {
    const parsed = await parseJsonBody<{
      conceptId: string;
      answers: Record<string, string>;
      questions?: PracticeQuestion[];
    }>(req);

    if (!parsed.ok || !parsed.data.conceptId || !parsed.data.answers) {
      return learnerJsonError(
        400,
        'INVALID_BODY',
        'conceptId and answers object are required',
        headers,
      );
    }

    try {
      const pool = await learnerPool();
      const learner = await getLearner(pool, learnerId);
      const language = learner?.language || 'or-IN';

      const concept = await getConcept(pool, parsed.data.conceptId);
      const conceptNameOr = concept?.nameOr || parsed.data.conceptId;
      const conceptNameEn = concept?.nameEn || parsed.data.conceptId;

      // Use questions passed from client, or fallback questions
      const questions: PracticeQuestion[] = parsed.data.questions || [];

      const result = await evaluatePracticeSubmission(
        pool,
        learnerId,
        parsed.data.conceptId,
        conceptNameOr,
        conceptNameEn,
        language,
        questions,
        parsed.data.answers,
      );

      // Persist any generated traces
      for (const trace of result.traces) {
        try {
          await recordDecisionTrace(pool, trace);
        } catch (err) {
          console.warn('[practice:submit] Failed to record trace:', err);
        }
      }

      return NextResponse.json(
        {
          success: true,
          overallScore: result.overallScore,
          questionScores: result.questionScores,
          gradingResult: result.gradingResult,
          updatedMastery: result.updatedMastery,
          replanned: result.replanned,
          traces: result.traces,
        },
        { headers },
      );
    } catch (error) {
      console.error('[practice:submit] Error evaluating practice answers:', error);
      return learnerJsonError(
        500,
        'PRACTICE_SUBMIT_ERROR',
        'Failed to evaluate practice answers',
        headers,
      );
    }
  });
}
