import { NextResponse } from 'next/server';
import { fail } from '@/lib/http';
import { graph, isCtx, metaCtx, metaFail } from '@/lib/meta';
export const runtime = 'nodejs'; export const dynamic = 'force-dynamic';
/** Targeting search: interests, demographics, behaviours, locations (Graph /search and /act_{id}/targetingbrowse). */
const TYPES: Record<string, Record<string, unknown>> = {
  interest: { type: 'adinterest' },
  location: { type: 'adgeolocation', location_types: ['country', 'region', 'city'] },
  demographic: { type: 'adTargetingCategory', class: 'demographics' },
  behavior: { type: 'adTargetingCategory', class: 'behaviors' },
  work: { type: 'adworkposition' },
};
export async function GET(req: Request) {
  const ctx = await metaCtx({ needAccount: false }); if (!isCtx(ctx)) return ctx;
  const u = new URL(req.url); const kind = u.searchParams.get('kind') ?? 'interest'; const q = (u.searchParams.get('q') ?? '').slice(0, 100);
  if (!TYPES[kind]) return fail(400, `kind must be one of ${Object.keys(TYPES).join(', ')}.`);
  if (!q && kind !== 'demographic' && kind !== 'behavior') return fail(400, 'Add a search term (q).');
  try { const d = await graph<{ data: Record<string, unknown>[] }>(ctx.conn.token, 'search', { params: { ...TYPES[kind], ...(q ? { q } : {}), limit: 25 } }); return NextResponse.json({ kind, results: d.data }); }
  catch (e) { return metaFail(e); }
}
