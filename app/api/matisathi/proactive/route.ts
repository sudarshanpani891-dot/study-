/**
 * MatiSathi Proactive Agent Endpoint
 * GET /api/matisathi/proactive
 * Returns an unprompted follow-up study challenge based on the student's
 * recent misconceptions and retention decay.
 */

import { NextRequest, NextResponse } from 'next/server';
import { scheduleProactiveNudge } from '@/lib/matisathi/tools';
import { CLASS_9_CURRICULUM } from '@/lib/matisathi/curriculum-kb';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const conceptId = url.searchParams.get('conceptId') || 'sci-cell-biology';

  const capsule =
    CLASS_9_CURRICULUM.find((c) => c.id === conceptId) || CLASS_9_CURRICULUM[0];

  const nudge = scheduleProactiveNudge(capsule.id, capsule, true);

  return NextResponse.json({
    nudge,
    timestamp: new Date().toISOString(),
  });
}
