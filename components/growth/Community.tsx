'use client';
import { useEffect, useState } from 'react';
import Icon from '../Icon';
import { useWs, ErrorNote, Pill } from '../ws';
import { api } from '@/lib/client/api';
import { cachedSettings } from '@/lib/client/settings';
import { useBrand, briefFor } from './useBrand';

type Thread = { id: string; source: 'reddit' | 'hackernews'; community: string; title: string; text: string; url: string; score: number; comments: number; createdAt: string; intent: boolean };
type Draft = { fit: string; why: string; reply: string };
const ago = (s: string) => { const h = (Date.now() - new Date(s).getTime()) / 36e5; return h < 24 ? `${Math.max(1, Math.round(h))}h ago` : `${Math.round(h / 24)}d ago`; };

export default function Community() {
  const { toast, store } = useWs(); const { brand } = useBrand();
  const [query, setQuery] = useState(''); const [days, setDays] = useState(30);
  const [threads, setThreads] = useState<Thread[] | null>(null); const [sources, setSources] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(''); const [error, setError] = useState<unknown>(null); const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [onlyIntent, setOnlyIntent] = useState(false);
  useEffect(() => { if (brand?.docs && !query) setQuery(brand.docs.keywords.slice(0, 1).map(k => k.keyword).join('') || brand.docs.product.category); }, [brand, query]);

  async function search() { setBusy('search'); setError(null); try { const r = await api<{ threads: Thread[]; sources: Record<string, string> }>('/api/growth/community', { query, days, subreddits: cachedSettings().agents.reddit.subreddits }); setThreads(r.threads); setSources(r.sources); } catch (e) { setError(e); } finally { setBusy(''); } }
  async function draft(t: Thread) {
    setBusy(t.id); setError(null);
    try { const r = await api<{ result: Draft }>('/api/growth/reply', { ...t, brief: briefFor(brand, 'reddit') }); setDrafts(d => ({ ...d, [t.id]: r.result })); await store.save('threads', { title: t.title, data: { thread: t, draft: r.result } }); }
    catch (e) { setError(e); } finally { setBusy(''); }
  }
  const shown = (threads ?? []).filter(t => !onlyIntent || t.intent);
  return <div className="growth one">
    <section className="panel">
      <div className="url-row"><input className="input" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && query && search()} placeholder='e.g. "bookkeeping for freelancers"' />
        <select className="input narrow" value={days} onChange={e => setDays(Number(e.target.value))}>{[7, 30, 90, 365].map(d => <option key={d} value={d}>Last {d} days</option>)}</select>
        <button className="btn primary" disabled={!query || !!busy} onClick={search}>{busy === 'search' ? <><span className="spin" />Listening…</> : 'Find conversations'}</button></div>
      <div className="row between"><div className="row">{Object.entries(sources).map(([k, v]) => <Pill key={k} ok={v.startsWith('ok')}>{k === 'hackernews' ? 'Hacker News' : 'Reddit'}: {v.startsWith('ok') ? v : 'unavailable'}</Pill>)}</div>
        {threads && <label className="small row"><input type="checkbox" checked={onlyIntent} onChange={e => setOnlyIntent(e.target.checked)} />Only buying-intent threads</label>}</div>
      {Object.entries(sources).filter(([, v]) => !v.startsWith('ok')).map(([k, v]) => <p key={k} className="small muted">{v}</p>)}
      <ErrorNote error={error} onClose={() => setError(null)} />
      <p className="small muted">Searches public Hacker News and Reddit. Replies are drafts. Nothing is ever posted for you; open the thread and reply as yourself.{!brand?.docs && ' Write a strategy brief first for on-brand drafts.'}</p>
    </section>
    {threads && !shown.length && <div className="blank"><h3>No matching threads</h3><p>Try broader words, a competitor name, or a longer time window.</p></div>}
    <div className="threads">{shown.map(t => <article key={t.id} className="card thread">
      <div className="row between"><div className="row"><span className="chip">{t.community}</span>{t.intent && <span className="chip hot">buying intent</span>}<span className="small muted">{ago(t.createdAt)} · {t.score} pts · {t.comments} comments</span></div>
        <a className="btn ghost sm" href={t.url} target="_blank" rel="noreferrer">Open<Icon name="arrow" size={13} /></a></div>
      <h3>{t.title}</h3>{t.text && <p className="small muted clamp3">{t.text}</p>}
      {drafts[t.id] ? <div className="draft"><div className="row between"><span className="small"><b>Fit: {drafts[t.id].fit}</b> · {drafts[t.id].why}</span>
        <button className="btn sm" onClick={() => { navigator.clipboard.writeText(drafts[t.id].reply); toast('Reply copied'); }}><Icon name="copy" />Copy</button></div><p className="pre">{drafts[t.id].reply}</p></div>
        : <button className="btn sm" disabled={!!busy} onClick={() => draft(t)}>{busy === t.id ? <><span className="spin" />Drafting…</> : 'Draft a helpful reply'}</button>}
    </article>)}</div>
  </div>;
}
