/**
 * GET /api/learner/concepts
 * List concepts with optional filtering by subject or chapter
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { isServerPersistenceConfigured } from '@/lib/config/feature-flags';
import { learnerDbUnavailableResponse, learnerJsonError, learnerPool } from '@/lib/server/learner/http';
import { listConcepts } from '@/lib/server/learner/repository';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  if (!isServerPersistenceConfigured()) {
    return learnerDbUnavailableResponse();
  }

  const { searchParams } = new URL(req.url);
  const subject = searchParams.get('subject') || undefined;
  const chapter = searchParams.get('chapter') || undefined;

  try {
    const pool = await learnerPool();
    const concepts = await listConcepts(pool, { subject, chapter });
    return NextResponse.json({ concepts });
  } catch (error) {
    console.error('[learner:concepts:get] Error:', error);
    return learnerJsonError(500, 'CONCEPTS_LIST_ERROR', 'Failed to retrieve concepts');
  }
}
