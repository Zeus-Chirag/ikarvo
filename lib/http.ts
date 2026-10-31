import { NextResponse } from 'next/server';
export function fail(status: number, error: string, setup?: string[]) {
  return NextResponse.json({ error, ...(setup?.length ? { setup } : {}) }, { status });
}
export function notConfigured(feature: string, keys: string[]) {
  return fail(503, `${feature} is not configured. Add ${keys.join(', ')} to .env.local and restart the server.`, keys);
}
export async function readJson<T = Record<string, unknown>>(req: Request): Promise<T | null> {
  try { return (await req.json()) as T; } catch { return null; }
}
export const str = (x: unknown, max = 4000) => (typeof x === 'string' ? x.trim().slice(0, max) : '');
