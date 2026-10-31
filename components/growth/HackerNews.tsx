'use client';
import { useEffect, useState } from 'react';
import Icon from '../Icon';
import { useWs, ErrorNote } from '../ws';
import { api } from '@/lib/client/api';
import type { Doc } from '@/lib/client/store';
import { useBrand, briefFor } from './useBrand';

type Set = { variants: { title: string; url: string; body: string; angle: string }[]; bestTime: string; firstCommentTips: string[] };
export default function HackerNews() {
  const { store, toast } = useWs(); const { brand } = useBrand();
  const [notes, setNotes] = useState(''); const [list, setList] = useState<Doc<Set>[]>([]); const [busy, setBusy] = useState(false); const [error, setError] = useState<unknown>(null);
  useEffect(() => { store.list<Set>('hn').then(setList).catch(() => {}); }, [store]);
  async function gen() { setBusy(true); setError(null); try { const r = await api<{ result: Set }>('/api/growth/hn', { brief: briefFor(brand, 'hn'), url: brand?.url, notes }); const d = await store.save<Set>('hn', { title: r.result.variants?.[0]?.title ?? 'Show HN', data: r.result }); setList(l => [d, ...l]); } catch (e) { setError(e); } finally { setBusy(false); } }
  const cur = list[0]?.data;
  return <div className="growth">
    <section className="panel"><h2 className="h2">Show HN drafts</h2>
      <p className="small muted">Three plain, technical drafts. Hacker News has no posting API and dislikes automation, so you submit it yourself at news.ycombinator.com/submit.</p>
      <label className="label">Technical notes (stack, what is hard, what is rough)<textarea rows={5} value={notes} onChange={e => setNotes(e.target.value)} /></label>
      <button className="btn primary wide" disabled={busy} onClick={gen}>{busy ? <><span className="spin" />Drafting…</> : 'Draft 3 variations'}</button>
      <ErrorNote error={error} onClose={() => setError(null)} /></section>
    <section className="docs">{!cur ? <div className="blank"><h3>Launch where builders read</h3><p>Honest first-person posts that invite feedback.</p></div> : <>
      {cur.variants.map((v, i) => <article key={i} className="card spaced"><span className="chip">{v.angle}</span><h3>{v.title}</h3><p className="pre">{v.body}</p>
        <div className="row"><button className="btn sm" onClick={() => { navigator.clipboard.writeText(`${v.title}\n${v.url}\n\n${v.body}`); toast('Copied'); }}><Icon name="copy" />Copy</button><a className="btn ghost sm" href={`https://news.ycombinator.com/submitlink?u=${encodeURIComponent(v.url || brand?.url || '')}&t=${encodeURIComponent(v.title)}`} target="_blank" rel="noreferrer">Open HN submit</a></div></article>)}
      <p className="small muted">Timing: {cur.bestTime}</p><ul className="ticks small">{cur.firstCommentTips?.map(t => <li key={t}>{t}</li>)}</ul></>}</section>
  </div>;
}
