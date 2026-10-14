/**
 * GET/POST /api/learner/mastery
 * Concept mastery tracking for the current learner
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { isServerPersistenceConfigured } from '@/lib/config/feature-flags';
import { learnerDbUnavailableResponse, learnerJsonError, learnerPool, parseJsonBody } from '@/lib/server/learner/http';
import { withLearner } from '@/lib/server/learner/identity';
import { getMastery, listLearnerMastery, recordMasteryAttempt } from '@/lib/server/learner/repository';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  if (!isServerPersistenceConfigured()) {
    return learnerDbUnavailableResponse();
  }

  return withLearner(req, async ({ learnerId }, headers) => {
    const { searchParams } = new URL(req.url);
    const conceptId = searchParams.get('conceptId');

    try {
      const pool = await learnerPool();
      if (conceptId) {
        const mastery = await getMastery(pool, learnerId, conceptId);
        return NextResponse.json({ mastery }, { headers });
      } else {
        const mastery = await listLearnerMastery(pool, learnerId);
        return NextResponse.json({ mastery }, { headers });
      }
    } catch (error) {
      console.error('[learner:mastery:get] Error:', error);
      return learnerJsonError(500, 'MASTERY_RETRIEVAL_ERROR', 'Failed to retrieve mastery records', headers);
    }
  });
}

export async function POST(req: NextRequest) {
  if (!isServerPersistenceConfigured()) {
    return learnerDbUnavailableResponse();
  }

  return withLearner(req, async ({ learnerId }, headers) => {
    const parsed = await parseJsonBody<{
      conceptId?: string;
      score?: number;
      nextReviewAt?: string | null;
    }>(req);

    if (!parsed.ok) {
      return learnerJsonError(400, 'INVALID_BODY', parsed.error, headers);
    }

    const { conceptId, score, nextReviewAt } = parsed.data;

    if (!conceptId || typeof conceptId !== 'string') {
      return learnerJsonError(400, 'MISSING_CONCEPT_ID', 'conceptId is required', headers);
    }

    if (score === undefined || typeof score !== 'number' || score < 0 || score > 1) {
      return learnerJsonError(
        400,
        'INVALID_SCORE',
        'score must be a number between 0 and 1 inclusive',
        headers,
      );
    }

    try {
      const pool = await learnerPool();
      const mastery = await recordMasteryAttempt(pool, {
        learnerId,
        conceptId,
        score,
        nextReviewAt,
      });
      return NextResponse.json({ mastery }, { status: 200, headers });
    } catch (error) {
      console.error('[learner:mastery:post] Error:', error);
      return learnerJsonError(500, 'MASTERY_RECORD_ERROR', 'Failed to record mastery attempt', headers);
    }
  });
}
