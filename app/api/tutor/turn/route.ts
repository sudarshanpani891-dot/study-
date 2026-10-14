/**
 * POST /api/tutor/turn
 * Real-time Multi-Agent Tutor Turn Endpoint with Server-Sent Events (SSE) Streaming.
 *
 * Runs the deterministic multi-agent supervisor orchestrator:
 * intake → concept_mapper → diagnostician → planner → tutor → language_guard → assessor (with looping) → followup
 */

import type { NextRequest } from 'next/server';

import { isServerPersistenceConfigured } from '@/lib/config/feature-flags';
import {
  learnerDbUnavailableResponse,
  learnerJsonError,
  learnerPool,
  parseJsonBody,
} from '@/lib/server/learner/http';
import { LEARNER_COOKIE_NAME, resolveLearnerId } from '@/lib/server/learner/identity';
import { getLearner } from '@/lib/server/learner/repository';
import {
  buildInitialMultiAgentState,
  createMultiAgentSupervisorGraph,
  type TutorSSEChunk,
} from '@/lib/orchestration/tutor/supervisor-graph';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!isServerPersistenceConfigured()) {
    return learnerDbUnavailableResponse();
  }

  // 1. Resolve anonymous or device-based learner identity
  const { learnerId, isNew } = resolveLearnerId(req);

  // 2. Parse request body
  const parsed = await parseJsonBody<{
    text?: string;
    query?: string;
    audioTranscript?: string;
    inputMode?: 'voice' | 'text';
    answers?: Record<string, string>;
    conceptId?: string;
    language?: string;
  }>(req);

  if (!parsed.ok) {
    return learnerJsonError(400, 'INVALID_BODY', parsed.error);
  }

  const rawInput =
    parsed.data.text ||
    parsed.data.query ||
    parsed.data.audioTranscript ||
    '';

  const inputMode = parsed.data.inputMode ?? (parsed.data.audioTranscript ? 'voice' : 'text');
  const explicitConceptId = parsed.data.conceptId ?? null;

  try {
    const pool = await learnerPool();
    const learner = await getLearner(pool, learnerId);

    const turnId = `turn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const language = parsed.data.language || learner?.language || 'or-IN';

    const initialState = buildInitialMultiAgentState({
      turnId,
      learnerId,
      query: rawInput,
      inputMode,
      language,
      learnerProfile: learner
        ? {
            id: learner.id,
            name: learner.name,
            grade: learner.grade,
            board: learner.board || 'BSE Odisha',
            language: learner.language,
            daily_minutes: learner.dailyMinutes || 60,
            exam_date: learner.examDate,
          }
        : undefined,
      explicitConceptId,
      queryable: pool,
    });

    const graph = createMultiAgentSupervisorGraph();

    // Check if client explicitly asks for non-streaming JSON
    const acceptHeader = req.headers.get('accept') || '';
    const wantsJson =
      acceptHeader.includes('application/json') && !acceptHeader.includes('text/event-stream');

    if (wantsJson) {
      // Non-streaming JSON mode (collect all events and return summary)
      const stream = await graph.stream(initialState, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        streamMode: 'custom' as any,
      });

      const collectedTraces: unknown[] = [];
      let teachingData = null;
      let quizData = null;
      let followupData = null;
      let doneData = null;

      for await (const chunk of stream) {
        const event = chunk as TutorSSEChunk;
        if (event.type === 'trace') collectedTraces.push(event.data);
        if (event.type === 'teaching') teachingData = event.data;
        if (event.type === 'quiz') quizData = event.data;
        if (event.type === 'followup') followupData = event.data;
        if (event.type === 'done') doneData = event.data;
      }

      const responseHeaders = new Headers({
        'Content-Type': 'application/json',
        'x-learner-id': learnerId,
      });

      if (isNew) {
        responseHeaders.append(
          'Set-Cookie',
          `${LEARNER_COOKIE_NAME}=${encodeURIComponent(learnerId)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000`,
        );
      }

      return Response.json(
        {
          turnId,
          learnerId,
          teaching: teachingData,
          quiz: quizData,
          followup: followupData,
          done: doneData,
          traces: collectedTraces,
        },
        { headers: responseHeaders },
      );
    }

    // Default: SSE Streaming Mode
    const encoder = new TextEncoder();
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();

    const responseHeaders = new Headers({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'x-learner-id': learnerId,
    });

    if (isNew) {
      responseHeaders.append(
        'Set-Cookie',
        `${LEARNER_COOKIE_NAME}=${encodeURIComponent(learnerId)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000`,
      );
    }

    // Background execution streaming chunks to client
    (async () => {
      try {
        const stream = await graph.stream(initialState, {
          streamMode: 'custom',
          writer: (chunk: unknown) => {
            try {
              writer.write(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
            } catch {
              // Writer may already be closed
            }
          },
        } as any);

        for await (const chunk of stream) {
          try {
            await writer.write(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
          } catch {
            break;
          }
        }
      } catch (streamError) {
        console.error('[TutorRoute] Multi-agent supervisor stream execution error:', streamError);
        try {
          await writer.write(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'error',
                data: {
                  message:
                    streamError instanceof Error
                      ? streamError.message
                      : 'An error occurred during multi-agent tutor execution',
                },
              })}\n\n`,
            ),
          );
        } catch {
          // Ignore write failure
        }
      } finally {
        try {
          await writer.close();
        } catch {
          // Ignore
        }
      }
    })();

    return new Response(readable, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('[TutorRoute] Request initialization failed:', error);
    return learnerJsonError(500, 'TUTOR_TURN_FAILED', 'Failed to initialize tutor turn');
  }
}
