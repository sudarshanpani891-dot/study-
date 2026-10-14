/**
 * GET/POST /api/learner/followups
 * Learner follow-up tasks and spaced repetition reminders
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { isServerPersistenceConfigured } from '@/lib/config/feature-flags';
import { learnerDbUnavailableResponse, learnerJsonError, learnerPool, parseJsonBody } from '@/lib/server/learner/http';
import { withLearner } from '@/lib/server/learner/identity';
import { createFollowup, listFollowups } from '@/lib/server/learner/repository';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  if (!isServerPersistenceConfigured()) {
    return learnerDbUnavailableResponse();
  }

  return withLearner(req, async ({ learnerId }, headers) => {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Number(limitParam) : undefined;

    try {
      const pool = await learnerPool();
      const followups = await listFollowups(pool, learnerId, { status, limit });
      return NextResponse.json({ followups }, { headers });
    } catch (error) {
      console.error('[learner:followups:get] Error:', error);
      return learnerJsonError(500, 'FOLLOWUPS_RETRIEVAL_ERROR', 'Failed to retrieve followups', headers);
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
      dueAt?: string;
      status?: string;
      payload?: Record<string, unknown>;
    }>(req);

    if (!parsed.ok) {
      return learnerJsonError(400, 'INVALID_BODY', parsed.error, headers);
    }

    const { conceptId, dueAt, status, payload } = parsed.data;

    if (!conceptId || typeof conceptId !== 'string') {
      return learnerJsonError(400, 'MISSING_CONCEPT_ID', 'conceptId is required', headers);
    }

    if (!dueAt || isNaN(new Date(dueAt).getTime())) {
      return learnerJsonError(400, 'INVALID_DUE_AT', 'dueAt must be a valid date or timestamp', headers);
    }

    try {
      const pool = await learnerPool();
      const followup = await createFollowup(pool, {
        learnerId,
        conceptId,
        dueAt,
        status,
        payload,
      });
      return NextResponse.json({ followup }, { status: 201, headers });
    } catch (error) {
      console.error('[learner:followups:post] Error:', error);
      return learnerJsonError(500, 'FOLLOWUP_CREATION_ERROR', 'Failed to create followup', headers);
    }
  });
}
