import { NextResponse } from 'next/server';
import { requireActor } from '@/lib/auth';
import { readJson, str, fail } from '@/lib/http';
import { graph, isCtx, metaAppMissing, metaCtx, metaFail, saveConn } from '@/lib/meta';
export const runtime = 'nodejs'; export const dynamic = 'force-dynamic';
const STATUS: Record<number, string> = { 1: 'Active', 2: 'Disabled', 3: 'Unsettled', 7: 'Pending risk review', 8: 'Pending settlement', 9: 'In grace period', 100: 'Pending closure', 101: 'Closed', 201: 'Any active', 202: 'Any closed' };
type Acct = { id: string; name: string; account_status: number; currency: string; timezone_name: string; business?: { name: string } };
/** Connection status + the ad accounts and Pages the token can use. */
export async function GET() {
  const actor = await requireActor(); if (actor instanceof NextResponse) return actor;
  const miss = metaAppMissing(); if (miss.length) return NextResponse.json({ configured: false, missing: miss, connected: false });
  const ctx = await metaCtx({ needAccount: false });
  if (!isCtx(ctx)) { const d = await ctx.json(); return NextResponse.json({ configured: true, missing: [], connected: false, reason: d.error }); }
  const c = ctx.conn;
  try {
    const [accts, pages] = await Promise.all([
      graph<{ data: Acct[] }>(c.token, 'me/adaccounts', { params: { fields: 'id,name,account_status,currency,timezone_name,business{name}', limit: 100 } }),
      graph<{ data: { id: string; name: string; category?: string }[] }>(c.token, 'me/accounts', { params: { fields: 'id,name,category', limit: 100 } }).catch(() => ({ data: [] })),
    ]);
    return NextResponse.json({ configured: true, missing: [], connected: true, source: c.source, user: c.userName, scopes: c.scopes, expiresAt: c.expiresAt ?? null,
      selected: { adAccountId: c.adAccountId ?? null, adAccountName: c.adAccountName ?? null, currency: c.currency ?? null, pageId: c.pageId ?? null, pageName: c.pageName ?? null },
      adAccounts: accts.data.map(a => ({ id: a.id, name: a.name, status: STATUS[a.account_status] ?? String(a.account_status), active: a.account_status === 1, currency: a.currency, timezone: a.timezone_name, business: a.business?.name ?? null })),
      pages: pages.data });
  } catch (e) { return metaFail(e); }
}
/** Pick the ad account (and Page) this workspace advertises with. Verified against the token before saving. */
export async function POST(req: Request) {
  const ctx = await metaCtx({ needAccount: false }); if (!isCtx(ctx)) return ctx;
  const b = await readJson<{ adAccountId?: string; pageId?: string }>(req); const id = str(b?.adAccountId, 40); const page = str(b?.pageId, 40);
  if (!/^act_\d+$/.test(id)) return fail(400, 'adAccountId must look like act_123456.');
  try {
    const a = await graph<Acct>(ctx.conn.token, id, { params: { fields: 'id,name,account_status,currency' } });
    if (a.account_status !== 1) return fail(409, `${a.name} is ${STATUS[a.account_status] ?? 'not active'} at Meta; pick an active ad account.`);
    let pageName: string | null = null; if (page) pageName = (await graph<{ name: string }>(ctx.conn.token, page, { params: { fields: 'name' } })).name;
    await saveConn(ctx.actor, { ...ctx.conn, adAccountId: a.id, adAccountName: a.name, currency: a.currency, pageId: page || null, pageName });
    return NextResponse.json({ ok: true, adAccountId: a.id, adAccountName: a.name, currency: a.currency, pageId: page || null, pageName });
  } catch (e) { return metaFail(e); }
}
