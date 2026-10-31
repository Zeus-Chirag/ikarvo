'use client';
import { useEffect, useState } from 'react';
import Icon from '../Icon';
import { useWs, ErrorNote, Pill, Acts } from '../ws';
import { api, download } from '@/lib/client/api';
import type { Doc } from '@/lib/client/store';
import { useBrand, briefFor } from './useBrand';

type Draft = { subject: string; message: string; followUp: string };
type Creator = { id: string; platform: 'youtube' | 'x'; name: string; handle: string; url: string; followers: number; avgViews?: number; about: string; sample: string; draft?: Draft };
type Site = { title: string; url: string; snippet: string; play: string; domain: string; query: string; draft?: Draft };
const n = (x: number) => x >= 1e6 ? `${(x / 1e6).toFixed(1)}M` : x >= 1e3 ? `${Math.round(x / 1e3)}k` : String(x);

/** Influencer finder (mode="influencers") or backlink finder (mode="backlinks"), both with AI outreach drafts. Drafts only; nothing is sent. */
export default function Outreach({ mode }: { mode: 'influencers' | 'backlinks' }) {
  const { store, status, toast, act } = useWs(); const { brand } = useBrand(); const table = mode;
  const [query, setQuery] = useState(''); const [min, setMin] = useState(1000); const [max, setMax] = useState(250000);
  const [domain, setDomain] = useState(''); const [competitors, setCompetitors] = useState('');
  const [items, setItems] = useState<Doc<Creator | Site>[]>([]); const [sources, setSources] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(''); const [error, setError] = useState<unknown>(null); const [sel, setSel] = useState<string | null>(null);
  useEffect(() => { store.list<Creator | Site>(table).then(setItems).catch(() => {}); }, [store, table]);
  useEffect(() => { const d = brand?.docs; if (!d || query) return; setQuery(d.keywords[0]?.keyword ?? d.product.category); setCompetitors(d.competitors.slice(0, 3).map(c => c.name).join(', ')); if (brand?.url) try { setDomain(new URL(brand.url).hostname); } catch {} }, [brand, query]);
  async function find() { setBusy('find'); setError(null);
    try {
      if (mode === 'influencers') { const r = await api<{ creators: Creator[]; sources: Record<string, string> }>('/api/growth/influencers', { query, minFollowers: min, maxFollowers: max }); setSources(r.sources);
        const saved = await Promise.all(r.creators.slice(0, 30).map(c => store.save<Creator>('influencers', { title: c.name, data: c }))); setItems(saved); toast(`${saved.length} creators found`); }
      else { const r = await api<{ opportunities: Site[] }>('/api/growth/backlinks', { topic: query, domain, competitors: competitors.split(',').map(s => s.trim()).filter(Boolean) });
        const saved = await Promise.all(r.opportunities.map(o => store.save<Site>('backlinks', { title: o.domain, data: o }))); setItems(saved); toast(`${saved.length} sites found`); }
    } catch (e) { setError(e); } finally { setBusy(''); } }
  async function draft(it: Doc<Creator | Site>) { setBusy(it.id); setError(null); setSel(it.id);
    const d = it.data as Creator & Site; const target = mode === 'influencers' ? `${d.platform} creator ${d.name} (${d.handle}), ${d.followers} followers. About: ${d.about}. Recent: ${d.sample}` : `${d.play} opportunity on ${d.domain}: "${d.title}" ${d.url}. ${d.snippet}`;
    try { const r = await api<{ result: Draft }>('/api/growth/outreach', { kind: mode === 'influencers' ? 'influencer' : 'backlink', target, brief: briefFor(brand) });
      const s = await store.save<Creator | Site>(table, { id: it.id, title: it.title, data: { ...it.data, draft: r.result } }); setItems(x => x.map(y => y.id === s.id ? s : y)); }
    catch (e) { setError(e); } finally { setBusy(''); } }
  const cur = items.find(i => i.id === sel); const dr = cur?.data.draft;
  const keysOk = mode === 'influencers' ? status.youtube.ok || status.xsearch.ok : status.search.ok;
  const csv = () => download(`${mode}.csv`, [mode === 'influencers' ? 'platform,name,handle,url,followers,subject,message' : 'play,domain,url,title,subject,message', ...items.map(i => { const d = i.data as Creator & Site; return (mode === 'influencers' ? [d.platform, d.name, d.handle, d.url, d.followers] : [d.play, d.domain, d.url, d.title]).concat([d.draft?.subject ?? '', d.draft?.message ?? '']).map(v => `"${String(v).replace(/"/g, '""')}"`).join(','); })].join('\n'), 'text/csv');
  return <div className="growth">
    <section className="panel">
      <h2 className="h2">{mode === 'influencers' ? 'Creator finder' : 'Backlink opportunities'}</h2>
      <p className="small muted">{mode === 'influencers' ? 'Searches YouTube and X for creators covering your topic, with audience size, then drafts a personal pitch.' : 'Runs search footprints (guest posts, resource pages, listicles, directories, alternatives and review pages) and drafts a pitch for each site.'} <b>Drafts only. Nothing is ever sent from here.</b></p>
      <label className="label">{mode === 'influencers' ? 'Topic' : 'Topic or category'}<input className="input" value={query} onChange={e => setQuery(e.target.value)} placeholder="no-code app builder" /></label>
      {mode === 'influencers' ? <div className="two"><label className="label">Min followers<input className="input" type="number" value={min} onChange={e => setMin(Number(e.target.value))} /></label><label className="label">Max followers<input className="input" type="number" value={max} onChange={e => setMax(Number(e.target.value))} /></label></div>
        : <><label className="label">Your domain (excluded)<input className="input" value={domain} onChange={e => setDomain(e.target.value)} /></label><label className="label">Competitors (comma-separated, up to 3)<input className="input" value={competitors} onChange={e => setCompetitors(e.target.value)} /></label></>}
      <button className="btn primary wide" disabled={!!busy || query.trim().length < 2} onClick={find}>{busy === 'find' ? <><span className="spin" />Searching…</> : mode === 'influencers' ? 'Find creators' : 'Find sites'}</button>
      <div className="chips">{mode === 'influencers' ? <><Pill ok={status.youtube.ok}>YouTube</Pill><Pill ok={status.xsearch.ok}>X search</Pill></> : <Pill ok={status.search.ok}>{status.search.ok ? 'Web search' : 'Web search not set up'}</Pill>}<Pill ok={status.ai.ok}>AI drafts</Pill></div>
      {!keysOk && <p className="small muted">Needs {mode === 'influencers' ? <><code>YOUTUBE_API_KEY</code> and/or <code>X_BEARER_TOKEN</code></> : <><code>BRAVE_SEARCH_API_KEY</code> or <code>SERPER_API_KEY</code></>}.</p>}
      {Object.entries(sources).filter(([, v]) => v !== 'ok').map(([k, v]) => <p key={k} className="small err-text">{k}: {v}</p>)}
      <ErrorNote error={error} onClose={() => setError(null)} />
    </section>
    <section className="docs">
      {!items.length ? <div className="blank"><h3>{mode === 'influencers' ? 'Find people your buyers already follow' : 'Find sites that link to tools like yours'}</h3><p>Results are saved, so you can work through them over time.</p></div> : <>
        <div className="row between"><h3>{items.length} {mode === 'influencers' ? 'creators' : 'sites'}</h3><button className="btn ghost sm" onClick={csv}><Icon name="download" />CSV</button></div>
        <div className="table">{items.map(i => { const d = i.data as Creator & Site; return <div key={i.id} className={`tr vis ${sel === i.id ? 'sel' : ''}`} onClick={() => setSel(i.id)}>
          <span><b>{mode === 'influencers' ? d.name : d.domain}</b><br /><span className="small muted trunc">{mode === 'influencers' ? `${d.platform === 'youtube' ? 'YouTube' : 'X'} · ${d.handle}` : d.title}</span></span>
          <span className="chip">{mode === 'influencers' ? n(d.followers) : d.play}</span>
          <span className="row">{d.draft && <span className="chip good">drafted</span>}<a className="btn ghost sm" href={d.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>Open</a><button className="btn sm" disabled={!!busy} onClick={e => { e.stopPropagation(); draft(i); }}>{busy === i.id ? 'Writing…' : d.draft ? 'Redraft' : 'Draft pitch'}</button></span></div>; })}</div>
        {dr && <article className="card spaced"><span className="label">Outreach draft · not sent</span><b>{dr.subject}</b><p className="pre">{dr.message}</p><span className="label">Follow-up (send after ~5 days if no reply)</span><p className="pre">{dr.followUp}</p>
          <button className="btn sm" onClick={() => { navigator.clipboard.writeText(`Subject: ${dr.subject}\n\n${dr.message}`); toast('Draft copied'); }}><Icon name="copy" />Copy draft</button></article>}
        {cur && <div className="nextbar"><span>Next for {mode === 'influencers' ? (cur.data as Creator).name : (cur.data as Site).domain}</span><Acts items={mode === 'influencers' ? [
          ['Write a sponsored-ad brief', () => act({ kind: 'ad', angle: `Creator-led ad in the style of ${(cur.data as Creator).name} (${(cur.data as Creator).platform}). Audience: ${(cur.data as Creator).about.slice(0, 200)}`, from: 'Creator finder' })],
          ['Build a creator landing page', () => act({ kind: 'build', prompt: `A partner landing page for viewers of ${(cur.data as Creator).name}: a personal welcome line, the offer, a discount-code field, benefits, FAQ and sign-up.\n\nProduct:\n${briefFor(brand).slice(0, 1200)}`, from: 'Creator finder' })]]
          : [['Write the guest article', () => act({ kind: 'article', topic: (cur.data as Site).title.slice(0, 160), angle: `Pitch-ready guest post for ${(cur.data as Site).domain} (${(cur.data as Site).play})`, from: 'Backlinks' })],
             ['Build a linkable resource page', () => act({ kind: 'build', prompt: `A free, genuinely useful resource page (calculator, checklist or template) that a site like ${(cur.data as Site).domain} would want to link to.\n\nProduct:\n${briefFor(brand).slice(0, 1200)}`, from: 'Backlinks' })]]} /></div>}
      </>}
    </section>
  </div>;
}
