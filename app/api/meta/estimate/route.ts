import { NextResponse } from 'next/server';
import { readJson, fail } from '@/lib/http';
import { graph, isCtx, metaCtx, metaFail } from '@/lib/meta';
export const runtime = 'nodejs';
type Est = { daily_outcomes_curve?: { spend: number; reach: number; impressions: number; actions: number }[]; estimate_dau?: number; estimate_mau_lower_bound?: number; estimate_mau_upper_bound?: number; estimate_ready?: boolean };
/** Reach estimate from GET /act_{id}/delivery_estimate for a targeting spec + optimisation goal. */
export async function POST(req: Request) {
  const ctx = await metaCtx(); if (!isCtx(ctx)) return ctx;
  const b = await readJson<{ targeting?: Record<string, unknown>; optimizationGoal?: string }>(req);
  if (!b?.targeting || typeof b.targeting !== 'object') return fail(400, 'Send a targeting spec.');
  try {
    const d = await graph<{ data: Est[] }>(ctx.conn.token, `${ctx.act}/delivery_estimate`, { params: { targeting_spec: b.targeting, optimization_goal: b.optimizationGoal || 'LINK_CLICKS' } });
    const e = d.data?.[0] ?? {};
    return NextResponse.json({ ready: e.estimate_ready !== false, mauLower: e.estimate_mau_lower_bound ?? null, mauUpper: e.estimate_mau_upper_bound ?? null, dau: e.estimate_dau ?? null, curve: (e.daily_outcomes_curve ?? []).slice(0, 40) });
  } catch (e) { return metaFail(e); }
}
