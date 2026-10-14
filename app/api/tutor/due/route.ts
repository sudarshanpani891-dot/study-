/**
 * GET /api/tutor/due
 * Proactive Follow-up Card Check (Step 6 & Step 9)
 * Checks for due spaced repetition follow-ups without requiring any background cron.
 * Returns the highest priority due card or null.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { isServerPersistenceConfigured } from '@/lib/config/feature-flags';
import {
  learnerDbUnavailableResponse,
  learnerJsonError,
  learnerPool,
} from '@/lib/server/learner/http';
import { withLearner } from '@/lib/server/learner/identity';
import { getLearner } from '@/lib/server/learner/repository';
import { getDueFollowupCard } from '@/lib/orchestration/tutor/agents/followup-agent';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  if (!isServerPersistenceConfigured()) {
    return learnerDbUnavailableResponse();
  }

  return withLearner(req, async ({ learnerId }, headers) => {
    try {
      const pool = await learnerPool();
      const learner = await getLearner(pool, learnerId);
      const language = learner?.language || 'or-IN';

      const card = await getDueFollowupCard(pool, learnerId, language);

      if (!card) {
        return NextResponse.json(
          {
            due: false,
            card: null,
          },
          { headers },
        );
      }

      return NextResponse.json(
        {
          due: true,
          card: {
            followupId: card.followup.id,
            hook: card.proactiveHook,
            conceptId: card.followup.conceptId,
            conceptName: card.conceptName,
            conceptNameEn: card.conceptNameEn,
            kind: card.followup.kind,
            dueAt: card.followup.dueAt,
          },
        },
        { headers },
      );
    } catch (error) {
      console.error('[tutor:due:get] Error fetching due followups:', error);
      return learnerJsonError(
        500,
        'DUE_FOLLOWUP_ERROR',
        'Failed to check for due followups',
        headers,
      );
    }
  });
}
