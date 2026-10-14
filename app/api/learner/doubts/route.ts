/**
 * GET/POST /api/learner/doubts
 * Learner doubts inquiry and tracking
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { isServerPersistenceConfigured } from '@/lib/config/feature-flags';
import { learnerDbUnavailableResponse, learnerJsonError, learnerPool, parseJsonBody } from '@/lib/server/learner/http';
import { withLearner } from '@/lib/server/learner/identity';
import { createDoubt, listDoubts } from '@/lib/server/learner/repository';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  if (!isServerPersistenceConfigured()) {
    return learnerDbUnavailableResponse();
  }

  return withLearner(req, async ({ learnerId }, headers) => {
    const { searchParams } = new URL(req.url);
    const resolvedParam = searchParams.get('resolved');
    const limitParam = searchParams.get('limit');

    const resolved =
      resolvedParam === 'true' ? true : resolvedParam === 'false' ? false : undefined;
    const limit = limitParam ? Number(limitParam) : undefined;

    try {
      const pool = await learnerPool();
      const doubts = await listDoubts(pool, learnerId, { resolved, limit });
      return NextResponse.json({ doubts }, { headers });
    } catch (error) {
      console.error('[learner:doubts:get] Error:', error);
      return learnerJsonError(500, 'DOUBTS_RETRIEVAL_ERROR', 'Failed to retrieve doubts', headers);
    }
  });
}

export async function POST(req: NextRequest) {
  if (!isServerPersistenceConfigured()) {
    return learnerDbUnavailableResponse();
  }

  return withLearner(req, async ({ learnerId }, headers) => {
    const parsed = await parseJsonBody<{
      text?: string;
      language?: string;
      detectedConceptId?: string | null;
    }>(req);

    if (!parsed.ok) {
      return learnerJsonError(400, 'INVALID_BODY', parsed.error, headers);
    }

    const { text, language, detectedConceptId } = parsed.data;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return learnerJsonError(400, 'MISSING_TEXT', 'text is required', headers);
    }

    try {
      const pool = await learnerPool();
      const doubt = await createDoubt(pool, {
        learnerId,
        text: text.trim(),
        language,
        detectedConceptId,
      });
      return NextResponse.json({ doubt }, { status: 201, headers });
    } catch (error) {
      console.error('[learner:doubts:post] Error:', error);
      return learnerJsonError(500, 'DOUBT_CREATION_ERROR', 'Failed to record doubt', headers);
    }
  });
}
