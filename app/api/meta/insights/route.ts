import { NextResponse } from 'next/server';
import { fail } from '@/lib/http';
import { INSIGHT_FIELDS, graph, isCtx, metaCtx, metaFail, normInsight, resultTypeFor, type RawInsight } from '@/lib/meta';
export const runtime = 'nodejs'; export const dynamic = 'force-dynamic';
const PRESETS = ['today', 'yesterday', 'last_7d', 'last_14d', 'last_30d', 'this_month', 'maximum'];
/** Spend, reach, CTR, CPA for a campaign: totals, daily series and per-ad breakdown. */
export async function GET(req: Request) {
  const ctx = await metaCtx(); if (!isCtx(ctx)) return ctx;
  const u = new URL(req.url); const id = u.searchParams.get('id') ?? ''; const preset = PRESETS.includes(u.searchParams.get('preset') ?? '') ? u.searchParams.get('preset')! : 'last_7d';
    if (!/^\d+$/.test(id)) return fail(400, 'Pass a campaign id.');
  try {
    const t = ctx.conn.token; const rt = u.searchParams.get('result') || await resultTypeFor(t, id); const p = { fields: INSIGHT_FIELDS, date_preset: preset };
    const [tot, daily, ads] = await Promise.all([
      graph<{ data: RawInsight[] }>(t, `${id}/insights`, { params: p }),
      graph<{ data: RawInsight[] }>(t, `${id}/insights`, { params: { ...p, time_increment: 1 } }),
      graph<{ data: RawInsight[] }>(t, `${id}/insights`, { params: { ...p, fields: `ad_id,ad_name,${INSIGHT_FIELDS}`, level: 'ad' } }),
    ]);
    return NextResponse.json({ preset, currency: ctx.conn.currency ?? 'USD', total: tot.data[0] ? normInsight(tot.data[0], rt) : null, daily: daily.data.map(d => normInsight(d, rt)), ads: ads.data.map(d => normInsight(d, rt)) });
  } catch (e) { return metaFail(e); }
}
