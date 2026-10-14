/**
 * GET/PUT /api/learner/profile
 * Anonymous device-based learner profile
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { isServerPersistenceConfigured } from '@/lib/config/feature-flags';
import { learnerDbUnavailableResponse, learnerJsonError, learnerPool, parseJsonBody } from '@/lib/server/learner/http';
import { withLearner } from '@/lib/server/learner/identity';
import { getOrCreateLearner, updateLearner } from '@/lib/server/learner/repository';
import type { DeviceProfile } from '@/lib/server/learner/types';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  if (!isServerPersistenceConfigured()) {
    return learnerDbUnavailableResponse();
  }

  return withLearner(req, async ({ learnerId }, headers) => {
    try {
      const pool = await learnerPool();
      const learner = await getOrCreateLearner(pool, learnerId);
      return NextResponse.json({ learner }, { headers });
    } catch (error) {
      console.error('[learner:profile:get] Error:', error);
      return learnerJsonError(500, 'LEARNER_PROFILE_ERROR', 'Failed to retrieve learner profile', headers);
    }
  });
}

export async function PUT(req: NextRequest) {
  if (!isServerPersistenceConfigured()) {
    return learnerDbUnavailableResponse();
  }

  return withLearner(req, async ({ learnerId }, headers) => {
    const parsed = await parseJsonBody<{
      name?: string | null;
      language?: string;
      grade?: string;
      deviceProfile?: DeviceProfile;
    }>(req);

    if (!parsed.ok) {
      return learnerJsonError(400, 'INVALID_BODY', parsed.error, headers);
    }

    try {
      const pool = await learnerPool();
      const learner = await updateLearner(pool, learnerId, parsed.data);
      return NextResponse.json({ learner }, { headers });
    } catch (error) {
      console.error('[learner:profile:put] Error:', error);
      return learnerJsonError(500, 'LEARNER_UPDATE_ERROR', 'Failed to update learner profile', headers);
    }
  });
}

export async function PATCH(req: NextRequest) {
  return PUT(req);
}
