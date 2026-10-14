/**
 * GET/POST /api/plan
 * Adaptive Study Plan API (Step 4 & Step 9)
 * GET: returns study plan, today's items, week view, and remaining daily minutes.
 * POST: triggers re-planning or updates plan item status (completed / skipped).
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { isServerPersistenceConfigured } from '@/lib/config/feature-flags';
import {
  learnerDbUnavailableResponse,
  learnerJsonError,
  learnerPool,
  parseJsonBody,
} from '@/lib/server/learner/http';
import { withLearner } from '@/lib/server/learner/identity';
import {
  getConcept,
  getOrCreateStudyPlan,
  listConcepts,
  listPlanItems,
  updatePlanItemStatus,
  type PlanItemStatus,
} from '@/lib/server/learner/repository';
import { generateAdaptiveStudyPlan } from '@/lib/orchestration/tutor/study-plan-engine';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  if (!isServerPersistenceConfigured()) {
    return learnerDbUnavailableResponse();
  }

  return withLearner(req, async ({ learnerId }, headers) => {
    try {
      const pool = await learnerPool();
      let plan = await getOrCreateStudyPlan(pool, learnerId);

      const todayStr = new Date().toISOString().split('T')[0];
      const endDateStr = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0];

      let allItems = await listPlanItems(pool, learnerId, {
        planId: plan.id,
        startDate: todayStr,
        endDate: endDateStr,
      });

      // If no items are scheduled yet, generate initial plan
      if (allItems.length === 0) {
        const generated = await generateAdaptiveStudyPlan(pool, learnerId);
        plan = generated.studyPlan;
        allItems = generated.itemsCreated;
      }

      const allConcepts = await listConcepts(pool);
      const conceptMap = new Map(allConcepts.map((c) => [c.id, c]));

      // Enrich plan items with concept details
      const enrichedItems = allItems.map((item) => {
        const c = conceptMap.get(item.conceptId);
        return {
          ...item,
          conceptNameOr: c?.nameOr || item.conceptId,
          conceptNameEn: c?.nameEn || item.conceptId,
          subject: c?.subject || 'Science',
          chapter: c?.chapter || 'Chapter 5',
        };
      });

      const todayItems = enrichedItems.filter((item) => item.scheduledDate === todayStr);

      // Calculate remaining minutes today (only pending items count towards remaining time)
      const remainingMinutesToday = todayItems
        .filter((item) => item.status === 'pending')
        .reduce((sum, item) => sum + (item.minutes || 20), 0);

      const completedMinutesToday = todayItems
        .filter((item) => item.status === 'completed')
        .reduce((sum, item) => sum + (item.minutes || 20), 0);

      return NextResponse.json(
        {
          studyPlan: plan,
          todayItems,
          weekItems: enrichedItems,
          remainingMinutesToday,
          completedMinutesToday,
          dailyBudgetMinutes: plan.dailyMinutes || 60,
        },
        { headers },
      );
    } catch (error) {
      console.error('[plan:get] Error retrieving study plan:', error);
      return learnerJsonError(500, 'PLAN_ERROR', 'Failed to retrieve study plan', headers);
    }
  });
}

export async function POST(req: NextRequest) {
  if (!isServerPersistenceConfigured()) {
    return learnerDbUnavailableResponse();
  }

  return withLearner(req, async ({ learnerId }, headers) => {
    const parsed = await parseJsonBody<{
      action?: 'replan' | 'complete_item' | 'update_budget';
      itemId?: string;
      status?: PlanItemStatus;
      dailyMinutes?: number;
      triggerConceptId?: string;
      lastQuizScore?: number;
      language?: string;
    }>(req);

    if (!parsed.ok) {
      return learnerJsonError(400, 'INVALID_BODY', parsed.error, headers);
    }

    try {
      const pool = await learnerPool();
      const action = parsed.data.action || 'replan';

      if (action === 'complete_item' && parsed.data.itemId) {
        const newStatus = parsed.data.status || 'completed';
        const updated = await updatePlanItemStatus(
          pool,
          parsed.data.itemId,
          learnerId,
          newStatus,
        );

        return NextResponse.json({ success: true, item: updated }, { headers });
      }

      // Handle re-planning or budget updates
      const generated = await generateAdaptiveStudyPlan(pool, learnerId, {
        language: parsed.data.language,
        triggerConceptId: parsed.data.triggerConceptId,
        lastQuizScore: parsed.data.lastQuizScore,
      });

      const todayStr = new Date().toISOString().split('T')[0];
      const todayItems = generated.itemsCreated.filter((i) => i.scheduledDate === todayStr);
      const remainingMinutesToday = todayItems
        .filter((i) => i.status === 'pending')
        .reduce((sum, i) => sum + (i.minutes || 20), 0);

      return NextResponse.json(
        {
          success: true,
          studyPlan: generated.studyPlan,
          todayItems,
          weekItems: generated.itemsCreated,
          remainingMinutesToday,
        },
        { headers },
      );
    } catch (error) {
      console.error('[plan:post] Error updating study plan:', error);
      return learnerJsonError(500, 'PLAN_UPDATE_ERROR', 'Failed to update study plan', headers);
    }
  });
}
