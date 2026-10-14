/**
 * Anonymous Device-based Learner Identity Seam
 * No-login anonymous learner identity based on device headers or cookies.
 */

import { randomUUID } from 'node:crypto';
import type { NextRequest } from 'next/server';

export const LEARNER_COOKIE_NAME = 'learner_id';
export const DEVICE_COOKIE_NAME = 'device_id';
export const LEARNER_HEADER_NAME = 'x-learner-id';
export const DEVICE_HEADER_NAME = 'x-device-id';

export interface LearnerIdentityOutcome {
  learnerId: string;
  isNew: boolean;
}

/**
 * Resolves learner id from headers, cookies, or query params.
 * Falls back to minting an anonymous device-based id if none is found.
 */
export function resolveLearnerId(req: Request | NextRequest): LearnerIdentityOutcome {
  // 1. Check custom headers
  const headerId =
    req.headers.get(LEARNER_HEADER_NAME) ||
    req.headers.get(DEVICE_HEADER_NAME) ||
    req.headers.get('x-student-id');
  if (headerId && headerId.trim()) {
    return { learnerId: headerId.trim(), isNew: false };
  }

  // 2. Check cookies
  if ('cookies' in req && typeof (req as NextRequest).cookies?.get === 'function') {
    const nextReq = req as NextRequest;
    const cookieVal =
      nextReq.cookies.get(LEARNER_COOKIE_NAME)?.value ||
      nextReq.cookies.get(DEVICE_COOKIE_NAME)?.value;
    if (cookieVal && cookieVal.trim()) {
      return { learnerId: cookieVal.trim(), isNew: false };
    }
  } else {
    const cookieHeader = req.headers.get('cookie');
    if (cookieHeader) {
      const match = cookieHeader.match(/(?:^|;\s*)(?:learner_id|device_id)=([^;]+)/);
      if (match && match[1]) {
        return { learnerId: decodeURIComponent(match[1]).trim(), isNew: false };
      }
    }
  }

  // 3. Check URL search params
  try {
    const url = new URL(req.url);
    const paramId =
      url.searchParams.get('learner_id') ||
      url.searchParams.get('device_id') ||
      url.searchParams.get('student_id');
    if (paramId && paramId.trim()) {
      return { learnerId: paramId.trim(), isNew: false };
    }
  } catch {
    // Ignore URL parse error
  }

  // 4. Fallback: generate a persistent device-based anonymous ID
  const mintedId = `anon_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
  return { learnerId: mintedId, isNew: true };
}

/**
 * Wraps route handling to supply resolved learner id and ensure response
 * headers carry the Set-Cookie and X-Learner-Id headers.
 */
export async function withLearner(
  req: NextRequest,
  handler: (context: { learnerId: string }, responseHeaders: Headers) => Promise<Response>,
): Promise<Response> {
  const { learnerId, isNew } = resolveLearnerId(req);
  const responseHeaders = new Headers();

  // Attach learner id header
  responseHeaders.set('x-learner-id', learnerId);

  // Set 1-year persistent cookie if minted or refreshed
  if (isNew) {
    responseHeaders.append(
      'Set-Cookie',
      `${LEARNER_COOKIE_NAME}=${encodeURIComponent(learnerId)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000`,
    );
  }

  const response = await handler({ learnerId }, responseHeaders);

  // Merge headers into response
  for (const [key, val] of responseHeaders.entries()) {
    if (key.toLowerCase() === 'set-cookie') {
      response.headers.append(key, val);
    } else if (!response.headers.has(key)) {
      response.headers.set(key, val);
    }
  }

  return response;
}
