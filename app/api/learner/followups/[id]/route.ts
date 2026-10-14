/**
 * PATCH /api/learner/followups/[id]
 * Update a learner follow-up status or payload
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { isServerPersistenceConfigured } from '@/lib/config/feature-flags';
import { learnerDbUnavailableResponse, learnerJsonError, learnerPool, parseJsonBody } from '@/lib/server/learner/http';
import { withLearner } from '@/lib/server/learner/identity';
import { updateFollowupStatus } from '@/lib/server/learner/repository';

export const runtime = 'nodejs';

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } },
) {
  if (!isServerPersistenceConfigured()) {
    return learnerDbUnavailableResponse();
  }

  const { id } = await Promise.resolve(context.params);

  return withLearner(req, async ({ learnerId }, headers) => {
    const parsed = await parseJsonBody<{
      status?: string;
      payload?: Record<string, unknown>;
    }>(req);

    if (!parsed.ok) {
      return learnerJsonError(400, 'INVALID_BODY', parsed.error, headers);
    }

    const { status, payload } = parsed.data;

    if (!status || typeof status !== 'string') {
      return learnerJsonError(400, 'MISSING_STATUS', 'status is required', headers);
    }

    try {
      const pool = await learnerPool();
      const followup = await updateFollowupStatus(pool, id, learnerId, status, payload);
      if (!followup) {
        return learnerJsonError(404, 'FOLLOWUP_NOT_FOUND', `Followup ${id} was not found`, headers);
      }
      return NextResponse.json({ followup }, { headers });
    } catch (error) {
      console.error('[learner:followups:patch] Error:', error);
      return learnerJsonError(500, 'FOLLOWUP_UPDATE_ERROR', 'Failed to update followup', headers);
    }
  });
}
