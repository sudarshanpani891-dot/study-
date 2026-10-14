/**
 * GET /api/trace/[turnId]
 * Decision Trace Retrieval Endpoint (Step 9)
 * Returns the full multi-agent decision trace log for a given turnId.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { isServerPersistenceConfigured } from '@/lib/config/feature-flags';
import {
  learnerDbUnavailableResponse,
  learnerJsonError,
  learnerPool,
} from '@/lib/server/learner/http';
import { listDecisionTracesForTurn } from '@/lib/server/learner/repository';

export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ turnId: string }> },
) {
  if (!isServerPersistenceConfigured()) {
    return learnerDbUnavailableResponse();
  }

  const { turnId } = await context.params;

  if (!turnId) {
    return learnerJsonError(400, 'MISSING_PARAM', 'turnId parameter is required');
  }

  try {
    const pool = await learnerPool();
    const traces = await listDecisionTracesForTurn(pool, turnId);

    return NextResponse.json({
      turnId,
      traceCount: traces.length,
      traces,
    });
  } catch (error) {
    console.error(`[trace:get] Error fetching traces for turn ${turnId}:`, error);
    return learnerJsonError(500, 'TRACE_FETCH_ERROR', 'Failed to retrieve decision traces');
  }
}
