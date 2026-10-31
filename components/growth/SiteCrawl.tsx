'use client';
import { useEffect, useRef, useState } from 'react';
import { useWs, ErrorNote, Pill, Acts } from '../ws';
import { fixPagePrompt } from './actions';
import { briefFor } from './useBrand';
import { api, download, fmtDate } from '@/lib/client/api';
import type { Doc } from '@/lib/client/store';
import { useBrand } from './useBrand';

type Issue = { code: string; severity: 'high' | 'medium' | 'low'; message: string };
type Page = { url: string; status: number; ms: number; title: string; description: string; h1: string[]; words: number; issues: Issue[] };
export type Crawl = { origin: string; discoveredBy: string; sitemapUrls: number; pages: Page[]; siteIssues: Issue[]; score: number; capped: boolean; at: string; pr?: { url: string; number: number } };
const FIXES = [['meta', 'Meta tag fixes (report + snippets)'], ['llms', 'llms.txt'], ['sitemap', 'sitemap.xml'], ['robots', 'robots.txt'], ['schema', 'Organization JSON-LD']] as const;

export default function SiteCrawl() {
  const { store, status, toast, act } = useWs(); const prRef = useRef<HTMLDivElement>(null);
  const toPr = () => { prRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); prRef.current?.classList.add('flash'); setTimeout(() => prRef.current?.classList.remove('flash'), 1600); }; const { brand } = useBrand();
  const [url, setUrl] = useState(''); const [max, setMax] = useState(25); const [list, setList] = useState<Doc<Crawl>[]>([]);
  const [busy, setBusy] = useState(''); const [error, setError] = useState<unknown>(null); const [open, setOpen] = useState<string | null>(null);
  const [repo, setRepo] = useState(''); const [fixes, setFixes] = useState<string[]>(['meta', 'llms', 'sitemap', 'schema']);
  useEffect(() => { store.list<Crawl>('crawls').then(setList).catch(() => {}); }, [store]);
  useEffect(() => { if (brand?.url && !url) setUrl(brand.url); }, [brand, url]);
  const cur = list[0]?.data;
  async function crawl() { setBusy('crawl'); setError(null);
    try { const r = await api<Crawl>('/api/growth/crawl', { url, maxPages: max }); const d = await store.save<Crawl>('crawls', { title: r.origin, data: r }); setList(l => [d, ...l]); toast(`Crawled ${r.pages.length} pages · score ${r.score}`); }
    catch (e) { setError(e); } finally { setBusy(''); } }
  async function pr() { if (!cur) return; setBusy('pr'); setError(null);
    try { const r = await api<{ url: string; number: number }>('/api/growth/seo-pr', { repo, fixes, siteUrl: cur.origin, brandName: brand?.docs?.product.name, summary: brand?.docs?.product.oneLiner, pages: cur.pages.map(p => ({ url: p.url, title: p.title, description: p.description, issues: p.issues })) });
      const d = await store.save<Crawl>('crawls', { id: list[0].id, title: list[0].title, data: { ...cur, pr: r } }); setList(l => [d, ...l.slice(1)]); toast(`Opened PR #${r.number}`); }
    catch (e) { setError(e); } finally { setBusy(''); } }
  const counts = cur ? (['high', 'medium', 'low'] as const).map(s => cur.pages.reduce((a, p) => a + p.issues.filter(i => i.severity === s).length, 0) + cur.siteIssues.filter(i => i.severity === s).length) : [];
  const csv = () => cur && download('crawl-issues.csv', ['url,status,severity,code,message', ...cur.pages.flatMap(p => p.issues.map(i => [p.url, p.status, i.severity, i.code, i.message].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')))].join('\n'), 'text/csv');
  return <div className="growth">
    <section className="panel">
      <h2 className="h2">Full-site crawl</h2>
      <p className="small muted">Reads robots.txt and sitemap.xml (nested indexes too), falls back to following links on the same host, then checks every page. Capped at 50 pages, public addresses only.</p>
      <label className="label">Website<input className="input" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com" /></label>
      <label className="label">Pages · {max}<input type="range" min={5} max={50} step={5} value={max} onChange={e => setMax(Number(e.target.value))} /></label>
      <button className="btn primary wide" disabled={!!busy || !url} onClick={crawl}>{busy === 'crawl' ? <><span className="spin" />Crawling…</> : 'Crawl site'}</button>
      <p className="small muted">No key needed.</p>
      <div className="divider" />
      <div ref={prRef} className="row between"><h2 className="h2">SEO fix pull request</h2><Pill ok={status.github.ok}>{status.github.ok ? 'GitHub ready' : 'GitHub not set up'}</Pill></div>
      <p className="small muted">Opens a pull request on a new branch with the files below. Nothing is merged; you review it on GitHub. Uses your connected GitHub account (Integrations).</p>
      <label className="label">Site repository<input className="input" value={repo} onChange={e => setRepo(e.target.value)} placeholder="owner/site-repo" /></label>
      <div className="checks">{FIXES.map(([k, l]) => <label key={k} className="check"><input type="checkbox" checked={fixes.includes(k)} onChange={e => setFixes(f => e.target.checked ? [...f, k] : f.filter(x => x !== k))} />{l}</label>)}</div>
      <button className="btn wide" disabled={!!busy || !cur || !repo || !fixes.length} onClick={pr}>{busy === 'pr' ? <><span className="spin" />Opening PR…</> : 'Open pull request'}</button>
      {cur?.pr && <p className="small muted">Merging the PR redeploys automatically if the repo is linked to Vercel (or Netlify) Git deploys.</p>}
      {cur?.pr && <p className="small ok-text">PR #{cur.pr.number}: <a className="link" href={cur.pr.url} target="_blank" rel="noreferrer">{cur.pr.url}</a></p>}
      <ErrorNote error={error} onClose={() => setError(null)} />
    </section>
    <section className="docs">
      {!cur ? <div className="blank"><h3>Every page, not just the homepage</h3><p>Missing titles, duplicate descriptions, thin pages, noindex tags, missing schema, slow responses and more, page by page.</p></div> : <>
        <div className="vis-head"><div className={`score s${cur.score >= 80 ? 'hi' : cur.score >= 50 ? 'mid' : 'lo'}`}><b>{cur.score}</b><span>/100</span></div>
          <div><h3>{cur.origin}</h3><p className="small muted">{cur.pages.length} pages via {cur.discoveredBy === 'sitemap' ? `sitemap (${cur.sitemapUrls} URLs listed)` : 'link discovery'}{cur.capped ? ' · capped' : ''} · {fmtDate(cur.at)}</p>
            <div className="chips"><span className="chip bad">{counts[0]} high</span><span className="chip">{counts[1]} medium</span><span className="chip">{counts[2]} low</span><button className="btn ghost sm" onClick={csv}>Export CSV</button></div>
            <Acts items={[(() => { const worst = [...cur.pages].sort((a, b) => b.issues.length - a.issues.length)[0]; return worst?.issues.length ? ['Fix worst page in Build Studio', () => act({ kind: 'build', title: `${worst.title || 'Page'} (fixed)`.slice(0, 60), prompt: fixPagePrompt({ url: worst.url, title: worst.title, description: worst.description, h1: worst.h1, issues: [...worst.issues, ...cur.siteIssues], brief: briefFor(brand) }), from: 'Site crawl' })] as [string, () => void] : null; })(), ['Deploy site-wide fixes (PR)', toPr]]} /></div></div>
        {!!cur.siteIssues.length && <div className="table">{cur.siteIssues.map(i => <div key={i.code} className="tr"><span className={`chip ${i.severity === 'high' ? 'bad' : ''}`}>{i.severity}</span><span>{i.message}</span><span className="small muted">site-wide</span></div>)}</div>}
        <div className="table spaced">{cur.pages.map(p => <div key={p.url}><div className="tr vis" onClick={() => setOpen(open === p.url ? null : p.url)}><span className="trunc">{p.url.replace(cur.origin.replace(/\/$/, ''), '') || '/'}</span><span className={`chip ${p.issues.some(i => i.severity === 'high') ? 'bad' : p.issues.length ? '' : 'good'}`}>{p.issues.length ? `${p.issues.length} issues` : 'clean'}</span><span className="small muted">{p.status} · {p.ms} ms · {p.words} words</span></div>
          {open === p.url && <div className="excerpt"><ul className="ticks small">{p.issues.map(i => <li key={i.code}><b>{i.severity}</b> · {i.message}</li>)}{!p.issues.length && <li>No issues found.</li>}</ul>
            {!!p.issues.length && <Acts items={[['Fix this page in Build Studio', () => act({ kind: 'build', title: `${p.title || p.url} (fixed)`.slice(0, 60), prompt: fixPagePrompt({ url: p.url, title: p.title, description: p.description, h1: p.h1, issues: p.issues, brief: briefFor(brand) }), from: 'Site crawl' })],
              ['Deploy fix as GitHub PR', toPr], p.words < 300 && ['Expand into an article', () => act({ kind: 'article', topic: p.title || p.url, angle: `Expand the thin page ${p.url} into a complete answer`, from: 'Site crawl' })]]} />}</div>}</div>)}</div>
      </>}
    </section>
  </div>;
}
