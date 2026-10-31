import { NextResponse } from 'next/server';
import { requireActor } from '@/lib/auth';
import { envValue } from '@/lib/env';
import { fail, readJson, str } from '@/lib/http';
import { googleAccess, googleKeys, googleScopes, YOUTUBE_SCOPE } from '@/lib/google';
export const runtime = 'nodejs';
export const maxDuration = 60;
const day = (d: number) => new Date(Date.now() - d * 864e5).toISOString().slice(0, 10);

async function g(token: string, url: string, body?: unknown) {
  const r = await fetch(url, { method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined, cache: 'no-store' });
  const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(`${new URL(url).hostname} ${r.status}: ${d?.error?.message ?? ''}`); return d;
}
/** GET: connection + list of Search Console sites and GA4 properties. */
export async function GET() {
  const configured = googleKeys.every(k => envValue(k)); if (!configured) return NextResponse.json({ configured, connected: false });
  let token: string | null; try { token = await googleAccess(); } catch (e) { return NextResponse.json({ configured, connected: false, error: e instanceof Error ? e.message : String(e) }); }
  if (!token) return NextResponse.json({ configured, connected: false });
  const youtube = (await googleScopes()).includes(YOUTUBE_SCOPE);
  const [sites, props] = await Promise.allSettled([g(token, 'https://www.googleapis.com/webmasters/v3/sites'), g(token, 'https://analyticsadmin.googleapis.com/v1beta/accountSummaries?pageSize=200')]);
  return NextResponse.json({ configured, connected: true, youtube,
    sites: sites.status === 'fulfilled' ? (sites.value.siteEntry ?? []).map((s: { siteUrl: string }) => s.siteUrl) : [], sitesError: sites.status === 'rejected' ? String(sites.reason?.message) : null,
    properties: props.status === 'fulfilled' ? (props.value.accountSummaries ?? []).flatMap((a: { displayName: string; propertySummaries?: { property: string; displayName: string }[] }) => (a.propertySummaries ?? []).map(p => ({ id: p.property, name: `${a.displayName} / ${p.displayName}` }))) : [], propertiesError: props.status === 'rejected' ? String(props.reason?.message) : null });
}
/** POST: 28-day report vs previous 28 days. */
export async function POST(req: Request) {
  const actor = await requireActor(); if (actor instanceof NextResponse) return actor;
  if (googleKeys.some(k => !envValue(k))) return fail(503, 'Google is not configured.', googleKeys.filter(k => !envValue(k)));
  let token: string | null; try { token = await googleAccess(); } catch (e) { return fail(502, e instanceof Error ? e.message : String(e)); }
  if (!token) return fail(401, 'Connect Google first (or reconnect: access was revoked or expired).');
  const b = await readJson(req); const site = str(b?.site, 300), property = str(b?.property, 80); const out: Record<string, unknown> = { range: { start: day(28), end: day(1) } };
  if (site) {
    const sc = (body: object) => g(token, `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`, body);
    try {
      const [cur, prev, queries, pages, daily] = await Promise.all([sc({ startDate: day(28), endDate: day(1) }), sc({ startDate: day(56), endDate: day(29) }), sc({ startDate: day(28), endDate: day(1), dimensions: ['query'], rowLimit: 25 }), sc({ startDate: day(28), endDate: day(1), dimensions: ['page'], rowLimit: 25 }), sc({ startDate: day(28), endDate: day(1), dimensions: ['date'] })]);
      out.search = { totals: cur.rows?.[0] ?? null, previous: prev.rows?.[0] ?? null, queries: queries.rows ?? [], pages: pages.rows ?? [], daily: daily.rows ?? [] };
    } catch (e) { out.searchError = e instanceof Error ? e.message : String(e); }
  }
  if (/^properties\/\d+$/.test(property)) {
    const ga = (body: object) => g(token, `https://analyticsdata.googleapis.com/v1beta/${property}:runReport`, body);
    try {
      const [tot, daily, pages, channels] = await Promise.all([
        ga({ dateRanges: [{ startDate: '28daysAgo', endDate: 'yesterday' }, { startDate: '56daysAgo', endDate: '29daysAgo' }], metrics: [{ name: 'sessions' }, { name: 'totalUsers' }, { name: 'keyEvents' }, { name: 'engagementRate' }] }),
        ga({ dateRanges: [{ startDate: '28daysAgo', endDate: 'yesterday' }], dimensions: [{ name: 'date' }], metrics: [{ name: 'sessions' }], orderBys: [{ dimension: { dimensionName: 'date' } }] }),
        ga({ dateRanges: [{ startDate: '28daysAgo', endDate: 'yesterday' }], dimensions: [{ name: 'pagePath' }], metrics: [{ name: 'screenPageViews' }, { name: 'sessions' }], limit: 15 }),
        ga({ dateRanges: [{ startDate: '28daysAgo', endDate: 'yesterday' }], dimensions: [{ name: 'sessionDefaultChannelGroup' }], metrics: [{ name: 'sessions' }], limit: 10 })]);
      const row = (r: { metricValues: { value: string }[] } | undefined) => r?.metricValues.map(m => Number(m.value)) ?? [];
      out.analytics = { metrics: ['sessions', 'users', 'keyEvents', 'engagementRate'], current: row(tot.rows?.find((r: { dimensionValues?: { value: string }[] }) => r.dimensionValues?.[0]?.value === 'date_range_0') ?? tot.rows?.[0]), previous: row(tot.rows?.find((r: { dimensionValues?: { value: string }[] }) => r.dimensionValues?.[0]?.value === 'date_range_1') ?? tot.rows?.[1]),
        daily: (daily.rows ?? []).map((r: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }) => [r.dimensionValues[0].value, Number(r.metricValues[0].value)]),
        pages: (pages.rows ?? []).map((r: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }) => [r.dimensionValues[0].value, Number(r.metricValues[0].value), Number(r.metricValues[1].value)]),
        channels: (channels.rows ?? []).map((r: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }) => [r.dimensionValues[0].value, Number(r.metricValues[0].value)]) };
    } catch (e) { out.analyticsError = e instanceof Error ? e.message : String(e); }
  }
  return NextResponse.json(out);
}
