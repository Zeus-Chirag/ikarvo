import 'server-only';
import { createHmac } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { envValue as v } from '@/lib/env';
import { seal, unseal, cookieOpts } from '@/lib/seal';
import { fail } from '@/lib/http';
import { requireActor, type Actor } from '@/lib/auth';

/**
 * Meta Marketing API (Graph API) client for the Meta Ads integration.
 * Tokens are per workspace: one row per owner in public.meta_connections (sealed with SESSION_SECRET).
 * In PREVIEW_MODE (no Supabase) the same sealed record lives in an httpOnly cookie instead.
 * META_GRAPH_BASE / META_GRAPH_VIDEO_BASE / META_OAUTH_BASE exist only so tests can point at a mock server.
 */
export const META_SCOPES = ['ads_management', 'ads_read', 'business_management', 'pages_show_list', 'pages_read_engagement'];
export const META_REQUIRED_SCOPES = ['ads_management', 'ads_read', 'business_management'];
export const GV = () => v('META_GRAPH_VERSION') || 'v26.0';
const graphBase = () => (v('META_GRAPH_BASE') || 'https://graph.facebook.com').replace(/\/+$/, '');
const videoBase = () => (v('META_GRAPH_VIDEO_BASE') || v('META_GRAPH_BASE') || 'https://graph-video.facebook.com').replace(/\/+$/, '');
export const oauthBase = () => (v('META_OAUTH_BASE') || 'https://www.facebook.com').replace(/\/+$/, '');
export const graphUrl = (path: string) => `${graphBase()}/${GV()}/${path.replace(/^\/+/, '')}`;

export type MetaConn = { token: string; expiresAt?: string | null; scopes: string[]; userId: string; userName: string;
  adAccountId?: string | null; adAccountName?: string | null; currency?: string | null; pageId?: string | null; pageName?: string | null; source: 'oauth' | 'env' };

/** Returns the exact missing app variables (META_APP_ID, META_APP_SECRET, SESSION_SECRET). */
export const metaAppMissing = () => ['META_APP_ID', 'META_APP_SECRET', 'SESSION_SECRET'].filter(k => !v(k));
export const metaUnconfigured = (m = metaAppMissing()) => fail(503, `Meta Ads is not configured. Missing ${m.join(', ')}. Add ${m.length > 1 ? 'them' : 'it'} to .env.local and restart.`, m);

export class MetaError extends Error { constructor(message: string, public status = 502, public code?: number, public setup?: string[]) { super(message); } }

function proof(token: string) { const s = v('META_APP_SECRET'); return s ? createHmac('sha256', s).update(token).digest('hex') : ''; }
function enc(params: Record<string, unknown>) {
  const p = new URLSearchParams();
  for (const [k, x] of Object.entries(params)) if (x !== undefined && x !== null) p.set(k, typeof x === 'string' ? x : JSON.stringify(x));
  return p;
}

/** One Graph call. Errors carry Meta's own message, code and fbtrace_id; never a fabricated success. */
export async function graph<T = Record<string, unknown>>(token: string, path: string, opts: { method?: 'GET' | 'POST' | 'DELETE'; params?: Record<string, unknown>; video?: boolean } = {}): Promise<T> {
  const method = opts.method ?? 'GET'; const params = { ...opts.params, access_token: token, ...(proof(token) ? { appsecret_proof: proof(token) } : {}) };
  const base = opts.video ? `${videoBase()}/${GV()}/${path.replace(/^\/+/, '')}` : graphUrl(path);
  let r: Response;
  try {
    r = method === 'GET' || method === 'DELETE' ? await fetch(`${base}?${enc(params)}`, { method, cache: 'no-store', signal: AbortSignal.timeout(60_000) })
      : await fetch(base, { method, body: enc(params), signal: AbortSignal.timeout(60_000) });
  } catch (e) { throw new MetaError(`Could not reach the Meta Graph API: ${e instanceof Error ? e.message : String(e)}`); }
  const d = await r.json().catch(() => ({})) as { error?: { message?: string; code?: number; error_user_msg?: string; error_user_title?: string; fbtrace_id?: string } };
  if (!r.ok || d.error) {
    const e = d.error ?? {}; const msg = e.error_user_msg || e.message || `HTTP ${r.status}`;
    // 190 = token expired/revoked; 10/200-299 = permission missing.
    const status = e.code === 190 ? 401 : e.code === 10 || (e.code && e.code >= 200 && e.code < 300) ? 403 : r.status >= 400 && r.status < 500 ? 400 : 502;
    throw new MetaError(`Meta API: ${msg}${e.fbtrace_id ? ` (fbtrace ${e.fbtrace_id})` : ''}`, status, e.code);
  }
  return d as T;
}
/** Multipart video upload to /act_{id}/advideos (the actual file bytes). */
export async function uploadAdVideo(token: string, act: string, file: Blob, name: string) {
  const f = new FormData(); f.set('access_token', token); if (proof(token)) f.set('appsecret_proof', proof(token)); f.set('source', file, name); f.set('name', name.slice(0, 250));
  const r = await fetch(`${videoBase()}/${GV()}/${act}/advideos`, { method: 'POST', body: f });
  const d = await r.json().catch(() => ({})); if (!r.ok || d.error) throw new MetaError(`Meta API: ${d?.error?.error_user_msg || d?.error?.message || `upload failed (${r.status})`}`, r.status === 413 ? 413 : 502);
  return d as { id: string };
}

const COOKIE = 'kx_meta';
type Row = { access_token: string; token_expires_at: string | null; scopes: string[] | null; meta_user_id: string; meta_user_name: string; ad_account_id: string | null; ad_account_name: string | null; currency: string | null; page_id: string | null; page_name: string | null };
const fromRow = (r: Row): MetaConn | null => { const t = unseal<{ t: string }>(r.access_token); return t ? { token: t.t, expiresAt: r.token_expires_at, scopes: r.scopes ?? [], userId: r.meta_user_id, userName: r.meta_user_name, adAccountId: r.ad_account_id, adAccountName: r.ad_account_name, currency: r.currency, pageId: r.page_id, pageName: r.page_name, source: 'oauth' } : null; };

export async function loadConn(actor: Actor): Promise<MetaConn | null> {
  if (actor.supabase) {
    const { data, error } = await actor.supabase.from('meta_connections').select('*').maybeSingle();
    if (error) throw new MetaError(`Could not read meta_connections: ${error.message}. Run the Supabase migrations.`, 503);
    if (data) return fromRow(data as Row);
  } else {
    const c = unseal<MetaConn>((await cookies()).get(COOKIE)?.value); if (c) return c;
  }
  // Single-owner fallback: a system-user token in env (same var Ad Studio delivery already uses).
  const t = v('META_ADS_TOKEN'); if (!t) return null;
  const acct = v('META_AD_ACCOUNT_ID'); return { token: t, scopes: [], userId: 'env', userName: 'Server token (META_ADS_TOKEN)', adAccountId: acct ? `act_${acct.replace(/^act_/, '')}` : null, pageId: v('FACEBOOK_PAGE_ID') || null, source: 'env' };
}

/** Persists the connection. Returns a cookie to set in preview mode. */
export async function saveConn(actor: Actor, c: MetaConn, res?: NextResponse) {
  if (c.source === 'env') throw new MetaError('This workspace uses META_ADS_TOKEN from the server env; set META_AD_ACCOUNT_ID / FACEBOOK_PAGE_ID instead of picking here.', 409);
  if (actor.supabase) {
    const { error } = await actor.supabase.from('meta_connections').upsert({ user_id: actor.id, access_token: seal({ t: c.token }), token_expires_at: c.expiresAt ?? null, scopes: c.scopes, meta_user_id: c.userId, meta_user_name: c.userName,
      ad_account_id: c.adAccountId ?? null, ad_account_name: c.adAccountName ?? null, currency: c.currency ?? null, page_id: c.pageId ?? null, page_name: c.pageName ?? null, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    if (error) throw new MetaError(`Could not save the Meta connection: ${error.message}. Run the Supabase migrations.`, 503);
  } else if (res) res.cookies.set(COOKIE, seal(c), { ...cookieOpts, maxAge: 60 * 60 * 24 * 60 });
  else (await cookies()).set(COOKIE, seal(c), { ...cookieOpts, maxAge: 60 * 60 * 24 * 60 });
}
export async function deleteConn(actor: Actor) {
  if (actor.supabase) { const { error } = await actor.supabase.from('meta_connections').delete().eq('user_id', actor.id); if (error) throw new MetaError(error.message, 503); }
  else (await cookies()).delete(COOKIE);
}

export type Ctx = { actor: Actor; conn: MetaConn; act: string };
/** Auth + config + token + ad-account gate shared by every Meta route. Returns a 503 that names the exact variable. */
export async function metaCtx(opts: { needAccount?: boolean } = {}): Promise<Ctx | NextResponse> {
  const actor = await requireActor(); if (actor instanceof NextResponse) return actor;
  const miss = metaAppMissing(); if (miss.length) return metaUnconfigured(miss);
  let conn: MetaConn | null; try { conn = await loadConn(actor); } catch (e) { return metaFail(e); }
  if (!conn) return fail(503, 'No Meta access token for this workspace. Connect Meta Ads in Integrations (OAuth), or set META_ADS_TOKEN for a single-owner install.', ['META_ADS_TOKEN']);
  if (conn.expiresAt && new Date(conn.expiresAt).getTime() < Date.now()) return fail(401, 'Your Meta token has expired. Reconnect Meta Ads in Integrations.');
  if (opts.needAccount !== false && !conn.adAccountId) return fail(409, conn.source === 'env' ? 'No ad account. Set META_AD_ACCOUNT_ID.' : 'Pick an ad account in Integrations → Meta Ads first.', conn.source === 'env' ? ['META_AD_ACCOUNT_ID'] : undefined);
  return { actor, conn, act: conn.adAccountId ?? '' };
}
export function metaFail(e: unknown) {
  if (e instanceof MetaError) return fail(e.status, e.message, e.setup);
  return fail(502, e instanceof Error ? e.message : String(e));
}
export const isCtx = (x: Ctx | NextResponse): x is Ctx => !(x instanceof NextResponse);

/** Best-effort audit log (Supabase only). Never blocks the Meta call that already succeeded. */
export async function logEvent(ctx: Ctx, object_type: string, object_id: string, action: string, detail: Record<string, unknown> = {}) {
  if (!ctx.actor.supabase) return;
  await ctx.actor.supabase.from('meta_ad_events').insert({ user_id: ctx.actor.id, ad_account_id: ctx.act, object_type, object_id, action, detail }).then(() => null, () => null);
}

// ---------- Marketing API shapes & helpers ----------
export const OBJECTIVES = {
  OUTCOME_TRAFFIC: { label: 'Traffic', goals: ['LANDING_PAGE_VIEWS', 'LINK_CLICKS'], result: { LANDING_PAGE_VIEWS: 'landing_page_view', LINK_CLICKS: 'link_click' } as Record<string, string> },
  OUTCOME_AWARENESS: { label: 'Awareness', goals: ['REACH', 'IMPRESSIONS'], result: {} as Record<string, string> },
  OUTCOME_ENGAGEMENT: { label: 'Video views', goals: ['THRUPLAY'], result: { THRUPLAY: 'video_thruplay_watched_actions' } as Record<string, string> },
} as const;
export type Objective = keyof typeof OBJECTIVES;
export const CTAS = ['LEARN_MORE', 'SIGN_UP', 'DOWNLOAD', 'GET_STARTED', 'SHOP_NOW', 'SUBSCRIBE', 'INSTALL_MOBILE_APP', 'CONTACT_US'];
const ZERO_DECIMAL = ['JPY', 'KRW', 'VND', 'CLP', 'ISK', 'TWD', 'HUF', 'COP', 'IDR', 'PYG', 'CRC'];
/** Meta budgets are in the currency's minor unit ("offset"). */
export const toMinor = (major: number, cur?: string | null) => Math.round(major * (ZERO_DECIMAL.includes((cur ?? 'USD').toUpperCase()) ? 1 : 100));
export const fromMinor = (minor: number | string | undefined, cur?: string | null) => minor === undefined ? null : Number(minor) / (ZERO_DECIMAL.includes((cur ?? 'USD').toUpperCase()) ? 1 : 100);

export type RawInsight = { spend?: string; reach?: string; impressions?: string; frequency?: string; clicks?: string; ctr?: string; cpc?: string; cpm?: string; date_start?: string; date_stop?: string; ad_id?: string; ad_name?: string;
  actions?: { action_type: string; value: string }[]; cost_per_action_type?: { action_type: string; value: string }[] };
export type Insight = { spend: number; reach: number; impressions: number; frequency: number; clicks: number; ctr: number; cpc: number | null; cpm: number | null; results: number; resultType: string; cpa: number | null; date?: string; adId?: string; adName?: string };
/** Normalises Graph insights. CPA = spend / results where "result" follows the optimisation goal (link clicks, landing-page views, leads, purchases). */
export function normInsight(r: RawInsight, resultType = 'link_click'): Insight {
  const n = (x?: string) => (x === undefined ? 0 : Number(x));
  const act = (t: string) => n(r.actions?.find(a => a.action_type === t)?.value);
  const pref = [resultType, 'offsite_conversion.fb_pixel_purchase', 'offsite_conversion.fb_pixel_lead', 'lead', 'landing_page_view', 'link_click'];
  const type = pref.find(t => act(t) > 0) ?? resultType; const results = act(type); const spend = n(r.spend);
  return { spend, reach: n(r.reach), impressions: n(r.impressions), frequency: n(r.frequency), clicks: n(r.clicks), ctr: n(r.ctr), cpc: r.cpc ? n(r.cpc) : null, cpm: r.cpm ? n(r.cpm) : null,
    results, resultType: type, cpa: results ? spend / results : null, date: r.date_start, adId: r.ad_id, adName: r.ad_name };
}
export const INSIGHT_FIELDS = 'spend,reach,impressions,frequency,clicks,ctr,cpc,cpm,actions,cost_per_action_type';
/** The action type that counts as a "result" (for CPA) given the campaign's ad-set optimisation goal. */
export async function resultTypeFor(token: string, campaignId: string) {
  const c = await graph<{ objective?: string; adsets?: { data: { optimization_goal?: string }[] } }>(token, campaignId, { params: { fields: 'objective,adsets{optimization_goal}' } }).catch(() => null);
  const goal = c?.adsets?.data?.[0]?.optimization_goal ?? 'LINK_CLICKS';
  return (OBJECTIVES[c?.objective as Objective]?.result as Record<string, string> | undefined)?.[goal] ?? 'link_click';
}
