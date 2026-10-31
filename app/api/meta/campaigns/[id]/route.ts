import { NextResponse } from 'next/server';
import { readJson, fail } from '@/lib/http';
import { graph, isCtx, logEvent, metaCtx, metaFail } from '@/lib/meta';
export const runtime = 'nodejs';
/**
 * Launch / pause / resume a campaign. launch and resume START SPENDING, so they require confirm:"LAUNCH"
 * (the UI sends it only after the user clicks the Launch confirmation that shows budget and schedule).
 * Launch activates the campaign and every ad set and ad under it; pause only pauses the campaign (children keep their state).
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await metaCtx(); if (!isCtx(ctx)) return ctx;
  const { id } = await params; if (!/^\d+$/.test(id)) return fail(400, 'Bad campaign id.');
  const b = await readJson<{ action?: string; confirm?: string }>(req); const action = b?.action;
  if (action !== 'launch' && action !== 'pause' && action !== 'resume') return fail(400, 'action must be launch, pause or resume.');
  if (action !== 'pause' && b?.confirm !== 'LAUNCH') return fail(428, 'Launching starts real ad spend. Confirm in the Launch dialog (confirm:"LAUNCH").');
  const t = ctx.conn.token;
  try {
    const c = await graph<{ account_id: string; name: string; adsets?: { data: { id: string }[] }; ads?: { data: { id: string }[] } }>(t, id, { params: { fields: 'account_id,name,adsets{id},ads{id}' } });
    if (`act_${c.account_id}` !== ctx.act) return fail(403, 'That campaign belongs to a different ad account.');
    if (action === 'pause') { await graph(t, id, { method: 'POST', params: { status: 'PAUSED' } }); await logEvent(ctx, 'campaign', id, 'paused'); return NextResponse.json({ ok: true, status: 'PAUSED' }); }
    // Children first so the campaign never goes live with nothing under it, then the campaign itself.
    if (action === 'launch') {
      for (const s of c.adsets?.data ?? []) await graph(t, s.id, { method: 'POST', params: { status: 'ACTIVE' } });
      for (const a of c.ads?.data ?? []) await graph(t, a.id, { method: 'POST', params: { status: 'ACTIVE' } });
    }
    await graph(t, id, { method: 'POST', params: { status: 'ACTIVE' } });
    await logEvent(ctx, 'campaign', id, action === 'launch' ? 'launched' : 'resumed', { adsets: c.adsets?.data?.length ?? 0, ads: c.ads?.data?.length ?? 0 });
    return NextResponse.json({ ok: true, status: 'ACTIVE', note: 'Meta reviews new ads before delivery (usually within 24 hours).' });
  } catch (e) { return metaFail(e); }
}
