/**
 * PATCH /api/learner/doubts/[id]
 * Update or resolve a learner doubt
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { isServerPersistenceConfigured } from '@/lib/config/feature-flags';
import { learnerDbUnavailableResponse, learnerJsonError, learnerPool, parseJsonBody } from '@/lib/server/learner/http';
import { withLearner } from '@/lib/server/learner/identity';
import { resolveDoubt } from '@/lib/server/learner/repository';

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
    const parsed = await parseJsonBody<{ resolved?: boolean }>(req);
    const resolved = parsed.ok && typeof parsed.data.resolved === 'boolean' ? parsed.data.resolved : true;

    try {
      const pool = await learnerPool();
      const doubt = await resolveDoubt(pool, id, learnerId, resolved);
      if (!doubt) {
        return learnerJsonError(404, 'DOUBT_NOT_FOUND', `Doubt ${id} was not found`, headers);
      }
      return NextResponse.json({ doubt }, { headers });
    } catch (error) {
      console.error('[learner:doubts:patch] Error:', error);
      return learnerJsonError(500, 'DOUBT_UPDATE_ERROR', 'Failed to update doubt', headers);
    }
  });
}
