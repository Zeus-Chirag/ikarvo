'use client';
import { useEffect, useState } from 'react';
import { useWs, ErrorNote, Acts } from '../ws';
import { api, fmtDate } from '@/lib/client/api';
import type { Doc } from '@/lib/client/store';
import { useBrand } from './useBrand';

type Result = { prompt: string; model: string; mentioned: boolean; position: number | null; competitors: { name: string; mentioned: boolean }[]; excerpt: string; citations?: string[]; cited?: boolean; citedPages?: string[] };
type Run = { brand: string; competitors: string[]; results: Result[]; share: number; citedShare?: number | null; grounded?: boolean; models: string[]; checkedAt: string };

export default function Visibility() {
  const { store, status, act } = useWs(); const { brand: b } = useBrand();
  const [brand, setBrand] = useState(''); const [competitors, setCompetitors] = useState(''); const [prompts, setPrompts] = useState('');
  const [runs, setRuns] = useState<Doc<Run>[]>([]); const [busy, setBusy] = useState(false); const [error, setError] = useState<unknown>(null); const [open, setOpen] = useState<number | null>(null); const [grounded, setGrounded] = useState(false);
  useEffect(() => { store.list<Run>('visibility').then(setRuns).catch(() => {}); store.list<{ pages: { url: string }[] }>('crawls').then(l => setCrawlPages(l[0]?.data.pages.map(p => p.url) ?? [])).catch(() => {}); }, [store]);
  const [crawlPages, setCrawlPages] = useState<string[]>([]);
  useEffect(() => {
    if (!b?.docs || brand) return; const d = b.docs; setBrand(d.product.name); setCompetitors(d.competitors.map(c => c.name).join(', '));
    setPrompts([`What are the best ${d.product.category} tools?`, ...d.positioning.icp.slice(0, 2).map(i => `${i.pain.replace(/\.$/, '')}. What should ${i.segment.toLowerCase()} use?`), ...d.competitors.slice(0, 2).map(c => `What are good alternatives to ${c.name}?`)].join('\n'));
  }, [b, brand]);
  async function run() {
    setBusy(true); setError(null);
    try { const r = await api<Omit<Run, 'brand' | 'competitors'>>('/api/growth/visibility', { brand, competitors: competitors.split(',').map(s => s.trim()).filter(Boolean), prompts: prompts.split('\n').map(s => s.trim()).filter(Boolean), grounded, domain: b?.url ?? '', pages: crawlPages });
      const d = await store.save<Run>('visibility', { title: `${brand} visibility`, data: { ...r, brand, competitors: competitors.split(',').map(s => s.trim()).filter(Boolean) } }); setRuns(x => [d, ...x]); }
    catch (e) { setError(e); } finally { setBusy(false); }
  }
  const latest = runs[0]?.data; const compRate = (name: string) => latest ? latest.results.filter(r => r.competitors.find(c => c.name === name)?.mentioned).length / latest.results.length : 0;
  return <div className="growth">
    <section className="panel">
      <h2 className="h2">AI answer visibility</h2>
      <p className="small muted">Asks AI models the questions your buyers ask, then records whether your brand and competitors get named. It uses the models in <code>VISIBILITY_MODELS</code> (or <code>AI_MODEL</code>) through your provider. Plain mode is a proxy from model memory. Search-grounded mode uses live web search answers with citations. Neither is a scrape of the ChatGPT or Gemini apps.</p>
      <label className="label">Brand<input className="input" value={brand} onChange={e => setBrand(e.target.value)} /></label>
      <label className="label">Competitors (comma-separated)<input className="input" value={competitors} onChange={e => setCompetitors(e.target.value)} /></label>
      <label className="label">Prompts to track (one per line, up to 15)<textarea rows={6} value={prompts} onChange={e => setPrompts(e.target.value)} placeholder={'What is the best invoicing app for freelancers?\nAlternatives to QuickBooks for solo founders'} /></label>
      <label className="check"><input type="checkbox" checked={grounded} onChange={e => setGrounded(e.target.checked)} />Search-grounded (live web answers with citations{status.grounded.ok ? ` · ${status.grounded.note}` : ''})</label>
      {grounded && !status.grounded.ok && <p className="small muted">Needs <code>PERPLEXITY_API_KEY</code>, or an OpenRouter <code>AI_API_KEY</code> (uses its <code>:online</code> web search).</p>}
      {grounded && <p className="small muted">Checks whether answers cite your domain{crawlPages.length ? ` and which of your ${crawlPages.length} crawled pages` : ' (run a site crawl to match individual pages)'}.</p>}
      <button className="btn primary wide" disabled={busy || !brand || !prompts.trim()} onClick={run}>{busy ? <><span className="spin" />Asking models…</> : 'Run visibility check'}</button>
      {!status.ai.ok && <p className="small muted">Needs <code>AI_API_KEY</code>.</p>}
      <ErrorNote error={error} onClose={() => setError(null)} />
    </section>
    <section className="docs">
      {!latest ? <div className="blank"><h3>Are you in the answer?</h3><p>Track how often assistants recommend you, and who they recommend instead. Each run is saved so you can compare over time.</p></div> : <>
        <div className="vis-head"><div className={`score s${latest.share >= .5 ? 'hi' : latest.share > 0 ? 'mid' : 'lo'}`}><b>{Math.round(latest.share * 100)}</b><span>%</span></div>
          <div><h3>Share of answers naming {latest.brand}</h3>{latest.grounded && latest.citedShare != null && <p className="small"><b>{Math.round(latest.citedShare * 100)}%</b> of answers cite your site</p>}<p className="small muted">{latest.grounded ? 'grounded · ' : ''}{latest.results.length} answers · {latest.models.join(', ')} · {fmtDate(latest.checkedAt)}</p>
            <div className="bars">{latest.competitors.map(c => <div key={c}><span className="small">{c}</span><i style={{ width: `${Math.max(2, compRate(c) * 100)}%` }} /><span className="small muted">{Math.round(compRate(c) * 100)}%</span></div>)}</div></div></div>
        {latest.share < 1 && <Acts items={[['Fix AI readiness (crawl + llms.txt PR)', () => act({ kind: 'tab', tab: 'crawl', from: 'AI visibility' })]]} />}
        <div className="table">{latest.results.map((r, i) => <div key={i}><div className="tr vis" onClick={() => setOpen(open === i ? null : i)}><span>{r.prompt}</span><span className={`chip ${r.mentioned ? 'good' : ''}`}>{r.mentioned ? `named · #${r.position}` : 'not named'}</span><span className="small muted">{r.competitors.filter(c => c.mentioned).map(c => c.name).join(', ') || 'no competitors named'}</span></div>
          {open === i && !r.mentioned && <Acts items={[['Write the answer article', () => act({ kind: 'article', topic: r.prompt, angle: `Answer-first page that should make assistants name ${latest.brand}; cover what they currently recommend: ${r.competitors.filter(c => c.mentioned).map(c => c.name).join(', ') || 'n/a'}`, from: 'AI visibility' })],
            ['Build a comparison page', () => act({ kind: 'build', prompt: `A page that directly answers "${r.prompt}" with a fair comparison table including ${latest.brand}${r.competitors.filter(c => c.mentioned).length ? ` and ${r.competitors.filter(c => c.mentioned).map(c => c.name).join(', ')}` : ''}, FAQ schema and Organization JSON-LD.`, from: 'AI visibility' })],
            ['Post about it', () => act({ kind: 'post', text: `${r.prompt} Here's our honest answer:`, from: 'AI visibility' })]]} />}
          {open === i && <div className="excerpt"><p className="pre small">{r.excerpt}</p>{!!r.citations?.length && <><span className="label">Sources cited</span><ul className="small">{r.citations.map(c => <li key={c} className={r.citedPages?.includes(c.replace(/\/+$/, '')) || (r.cited && b?.url && c.includes(new URL(b.url).hostname.replace(/^www\./, ''))) ? 'ok-text' : ''}><a className="link" href={c} target="_blank" rel="noreferrer">{c}</a></li>)}</ul></>}</div>}</div>)}</div>
        {runs.length > 1 && <><h2 className="h2 spaced">History</h2><div className="table">{runs.slice(0, 10).map(r => <div key={r.id} className="tr"><span>{fmtDate(r.data.checkedAt)}</span><span className="chip">{Math.round(r.data.share * 100)}%</span><span className="small muted">{r.data.results.length} answers</span></div>)}</div></>}
      </>}
    </section>
  </div>;
}
