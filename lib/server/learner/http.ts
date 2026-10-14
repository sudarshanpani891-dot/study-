/**
 * Learner HTTP utilities & database access
 */

import { NextResponse } from 'next/server';

import { isServerPersistenceConfigured } from '@/lib/config/feature-flags';
import { getServerPersistenceProvider } from '@/lib/persistence/server-provider';

export function learnerJsonError(
  status: number,
  code: string,
  message: string,
  headers?: Headers,
): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status, headers });
}

export function learnerDbUnavailableResponse(headers?: Headers): NextResponse {
  return learnerJsonError(
    503,
    'DATABASE_UNAVAILABLE',
    'PostgreSQL persistence is not configured or unavailable',
    headers,
  );
}

export async function learnerPool() {
  if (!isServerPersistenceConfigured()) {
    throw new Error('Database persistence is not configured');
  }
  return (await getServerPersistenceProvider(process.env.DATABASE_URL ?? '')).pool;
}

export async function parseJsonBody<T = Record<string, unknown>>(
  req: Request,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const text = await req.text();
    if (!text.trim()) return { ok: false, error: 'Empty request body' };
    const data = JSON.parse(text) as T;
    return { ok: true, data };
  } catch {
    return { ok: false, error: 'Malformed JSON payload' };
  }
}
