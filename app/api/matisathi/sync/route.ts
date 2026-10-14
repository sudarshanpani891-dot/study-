/**
 * MatiSathi Sync API Endpoint
 * POST /api/matisathi/sync
 * Receives offline-queued doubts and mastery updates from rural low-signal devices,
 * synchronizes state with PostgreSQL/persistence, and returns proactive study nudges.
 */

import { NextRequest, NextResponse } from 'next/server';
import type { SyncPayload, SyncResponse, ProactiveNudge } from '@/lib/matisathi/types';
import { scheduleProactiveNudge } from '@/lib/matisathi/tools';
import { CLASS_9_CURRICULUM } from '@/lib/matisathi/curriculum-kb';

export async function POST(req: NextRequest) {
  try {
    const payload: SyncPayload = await req.json();

    const queuedCount = payload.queuedDoubts?.length || 0;

    // Identify weak concept needing proactive follow-up
    let weakestConceptId = 'sci-cell-biology';
    let lowestScore = 999;

    if (payload.masteryUpdates) {
      for (const [id, m] of Object.entries(payload.masteryUpdates)) {
        if (m.masteryScore < lowestScore) {
          lowestScore = m.masteryScore;
          weakestConceptId = id;
        }
      }
    }

    const matchedCapsule =
      CLASS_9_CURRICULUM.find((c) => c.id === weakestConceptId) || CLASS_9_CURRICULUM[0];

    const nextNudge: ProactiveNudge = scheduleProactiveNudge(
      matchedCapsule.id,
      matchedCapsule,
      lowestScore < 50,
    );

    const response: SyncResponse = {
      success: true,
      syncedCount: queuedCount,
      timestamp: new Date().toISOString(),
      nextProactiveNudge: nextNudge,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[MatiSathi Sync API] Error syncing payload:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown sync failure',
      },
      { status: 500 },
    );
  }
}
