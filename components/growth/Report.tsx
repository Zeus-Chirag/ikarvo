'use client';
import { useCallback, useEffect, useState } from 'react';
import Icon from '../Icon';
import { useWs, ErrorNote, Acts } from '../ws';
import { routeTask } from './actions';
import { api, download, fmtDate } from '@/lib/client/api';
import type { Doc } from '@/lib/client/store';
import { useBrand, briefFor } from './useBrand';
import type { Report as GReport } from './Analytics';

type Facts = Record<string, Record<string, string | number | null>>;
type Narrative = { headline: string; summary: string; wins: string[]; concerns: string[]; nextActions: { action: string; why: string; channel: string }[] };
type Saved = { facts: Facts; narrative: Narrative | null; at: string };
const WEEK = 7 * 864e5;

export default function Report() {
  const { store, toast, act } = useWs(); const { brand } = useBrand();
  const [facts, setFacts] = useState<Facts | null>(null); const [nar, setNar] = useState<Narrative | null>(null); const [saved, setSaved] = useState<Doc<Saved>[]>([]);
  const [busy, setBusy] = useState(false); const [error, setError] = useState<unknown>(null);
  const gather = useCallback(async () => {
    const now = Date.now(); const safe = <T,>(p: Promise<Doc<T>[]>) => p.catch(() => [] as Doc<T>[]);
    type P = { channel: string; when: string; at?: string; done?: boolean; approved?: boolean; publishedUrl?: string; lastError?: string };
    const [posts, crawls, vis, arts, comps, inf, bl] = await Promise.all([safe(store.list<P>('posts')), safe(store.list<{ score: number; pages: unknown[]; at: string }>('crawls')), safe(store.list<{ share: number; citedShare?: number | null; checkedAt: string }>('visibility')),
      safe(store.list<{ published?: unknown[] }>('articles')), safe(store.list<{ snapshots: unknown[] }>('competitors')), safe(store.list<{ draft?: unknown }>('influencers')), safe(store.list<{ draft?: unknown }>('backlinks'))]);
    const t = (p: P) => new Date(p.at ?? p.when).getTime();
    const f: Facts = {
      social: { publishedLast7d: posts.filter(p => p.data.publishedUrl && now - t(p.data) < WEEK && t(p.data) <= now).length, markedPostedLast7d: posts.filter(p => p.data.done && now - t(p.data) < WEEK).length, scheduledNext7d: posts.filter(p => t(p.data) > now && t(p.data) - now < WEEK).length, approvedWaiting: posts.filter(p => p.data.approved && !p.data.publishedUrl && t(p.data) > now).length, failed: posts.filter(p => p.data.lastError && !p.data.publishedUrl).length },
      seo: { latestCrawlScore: crawls[0]?.data.score ?? null, previousCrawlScore: crawls[1]?.data.score ?? null, pagesCrawled: crawls[0]?.data.pages.length ?? null, lastCrawl: crawls[0] ? fmtDate(crawls[0].data.at) : null },
      aiVisibility: { latestShare: vis[0] ? Math.round(vis[0].data.share * 100) : null, previousShare: vis[1] ? Math.round(vis[1].data.share * 100) : null, citedShare: vis[0]?.data.citedShare != null ? Math.round(vis[0].data.citedShare * 100) : null },
      content: { articleDrafts: arts.length, articlesPublished: arts.filter(a => a.data.published?.length).length },
      outreach: { creatorsFound: inf.length, creatorPitchesDrafted: inf.filter(i => i.data.draft).length, backlinkSites: bl.length, backlinkPitchesDrafted: bl.filter(i => i.data.draft).length },
      competitors: { snapshots: comps.length, tracked: comps[0]?.data.snapshots.length ?? 0 },
    };
    try { const g = JSON.parse(localStorage.getItem('kx_last_google_report') || 'null') as GReport | null;
      if (g?.search?.totals) f.search = { clicks: g.search.totals.clicks, clicksPrev: g.search.previous?.clicks ?? null, impressions: g.search.totals.impressions, position: Number(g.search.totals.position.toFixed(1)), topQuery: g.search.queries[0]?.keys?.[0] ?? null };
      if (g?.analytics) f.analytics = Object.fromEntries(g.analytics.metrics.flatMap((m, i) => [[m, g.analytics!.current[i]], [`${m}Prev`, g.analytics!.previous[i]]]));
    } catch {}
    setFacts(f); setSaved(await safe(store.list<Saved>('reports')));
  }, [store]);
  useEffect(() => { gather(); }, [gather]);
  async function write() { if (!facts) return; setBusy(true); setError(null);
    try { const r = await api<{ result: Narrative }>('/api/growth/report', { data: facts, brief: briefFor(brand) }); setNar(r.result); const d = await store.save<Saved>('reports', { title: r.result.headline, data: { facts, narrative: r.result, at: new Date().toISOString() } }); setSaved(s => [d, ...s]); toast('Weekly report saved'); }
    catch (e) { setError(e); } finally { setBusy(false); } }
  const md = () => facts ? `# Weekly marketing report · ${new Date().toISOString().slice(0, 10)}\n\n${nar ? `## ${nar.headline}\n\n${nar.summary}\n\n### Wins\n${nar.wins.map(w => `- ${w}`).join('\n')}\n\n### Concerns\n${nar.concerns.map(w => `- ${w}`).join('\n')}\n\n### Next actions\n${nar.nextActions.map(a => `- [ ] **${a.channel}**: ${a.action} (${a.why})`).join('\n')}\n\n` : ''}## Numbers\n${Object.entries(facts).map(([k, v]) => `### ${k}\n${Object.entries(v).map(([a, b]) => `- ${a}: ${b ?? 'n/a'}`).join('\n')}`).join('\n\n')}\n` : '';
  return <div className="growth">
    <section className="panel">
      <h2 className="h2">Weekly report</h2>
      <p className="small muted">The numbers come straight from your saved work (posts, crawls, visibility runs, outreach, competitor snapshots) plus the last Search Console / GA4 load. They are counted here, not by AI. AI only writes the summary and next actions, using these numbers.</p>
      <div className="stack"><button className="btn wide" onClick={gather}>Refresh numbers</button><button className="btn primary wide" disabled={busy || !facts} onClick={write}>{busy ? <><span className="spin" />Writing…</> : 'Write summary + next actions'}</button>
        <button className="btn ghost wide" disabled={!facts} onClick={() => download('weekly-report.md', md(), 'text/markdown')}><Icon name="download" />Download .md</button></div>
      <ErrorNote error={error} onClose={() => setError(null)} />
      {!!saved.length && <><div className="divider" /><span className="label">Past reports</span>{saved.slice(0, 8).map(s => <button key={s.id} className="starter" onClick={() => { setNar(s.data.narrative); setFacts(s.data.facts); }}><span>{s.title}</span><span className="small muted">{fmtDate(s.data.at)}</span></button>)}</>}
    </section>
    <section className="docs">
      {nar && <article className="card"><h3>{nar.headline}</h3><p>{nar.summary}</p><div className="two"><div><span className="label">Wins</span><ul className="ticks">{nar.wins.map(w => <li key={w}>{w}</li>)}</ul></div><div><span className="label">Concerns</span><ul className="ticks">{nar.concerns.map(w => <li key={w}>{w}</li>)}</ul></div></div>
        <span className="label">Next actions</span>{nar.nextActions.map((a, i) => <div key={i} className="row between"><p><span className="chip">{a.channel}</span> <b>{a.action}</b> <span className="small muted">{a.why}</span></p><button className="btn act sm" onClick={() => act(routeTask(a.channel, a.action, 'Weekly report'))}>Do it →</button></div>)}</article>}
      {facts && <div className="nextbar"><span>Gaps this week</span><Acts items={[
        !facts.seo.latestCrawlScore && ['Run a site crawl', () => act({ kind: 'tab', tab: 'crawl', from: 'Weekly report' })],
        !facts.social.scheduledNext7d && ['Plan next week\'s posts', () => act({ kind: 'tab', tab: 'calendar', from: 'Weekly report' })],
        !!facts.social.scheduledNext7d && !facts.social.approvedWaiting && ['Approve scheduled posts', () => act({ kind: 'tab', tab: 'calendar', from: 'Weekly report' })],
        facts.aiVisibility.latestShare == null && ['Check AI visibility', () => act({ kind: 'tab', tab: 'visibility', from: 'Weekly report' })],
        !facts.content.articleDrafts && ['Write first article', () => act({ kind: 'tab', tab: 'articles', from: 'Weekly report' })],
        !facts.outreach.creatorPitchesDrafted && !facts.outreach.backlinkPitchesDrafted && ['Start outreach', () => act({ kind: 'tab', tab: 'influencers', from: 'Weekly report' })],
        !facts.competitors.snapshots && ['Snapshot competitors', () => act({ kind: 'tab', tab: 'competitors', from: 'Weekly report' })],
        !facts.search && ['Connect Search Console + GA4', () => act({ kind: 'tab', tab: 'analytics', from: 'Weekly report' })]]} /></div>}
      {facts && <div className="stats spaced">{Object.entries(facts).map(([k, v]) => <div key={k} className="stat wide"><span className="label">{k}</span>{Object.entries(v).map(([a, b]) => <div key={a} className="row between small"><span className="muted">{a}</span><b>{b ?? '–'}</b></div>)}</div>)}</div>}
    </section>
  </div>;
}
