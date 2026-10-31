'use client';
import { useEffect, useState } from 'react';
import { useWs, ErrorNote, Acts } from '../ws';
import { beatPrompt } from './actions';
import { briefFor } from './useBrand';
import { api, fmtDate } from '@/lib/client/api';
import type { Doc } from '@/lib/client/store';
import { useBrand } from './useBrand';

type Page = { url: string; status: number; title?: string; desc?: string; heads?: string[]; prices?: string[]; ctas?: string[]; words?: number; hash?: string; error?: string };
type Snap = { input: string; domain: string; home: Page; pricing: Page; at: string };
type Run = { snapshots: Snap[]; at: string };
type Change = { field: string; before: string; after: string };
function diff(a: Page | undefined, b: Page): Change[] {
  if (!a || !b || a.hash === b.hash) return []; const out: Change[] = [];
  if (a.title !== b.title) out.push({ field: 'Title', before: a.title ?? '', after: b.title ?? '' });
  const set = (x?: string[]) => new Set(x ?? []); const add = [...set(b.heads)].filter(h => !set(a.heads).has(h)), rem = [...set(a.heads)].filter(h => !set(b.heads).has(h));
  if (add.length || rem.length) out.push({ field: 'Headings', before: rem.join(' | '), after: add.join(' | ') });
  if ((a.prices ?? []).join() !== (b.prices ?? []).join()) out.push({ field: 'Prices', before: (a.prices ?? []).join(', '), after: (b.prices ?? []).join(', ') });
  return out;
}
export default function Competitors() {
  const { store, toast, act } = useWs(); const { brand } = useBrand(); const [urls, setUrls] = useState('');
  const [runs, setRuns] = useState<Doc<Run>[]>([]); const [busy, setBusy] = useState(false); const [error, setError] = useState<unknown>(null);
  useEffect(() => { store.list<Run>('competitors').then(setRuns).catch(() => {}); }, [store]);
  useEffect(() => { const p = localStorage.getItem('ikarvo:pulse'); if (p) { localStorage.removeItem('ikarvo:pulse'); setUrls(p); } }, []);
  useEffect(() => { if (!urls && runs[0]) setUrls(runs[0].data.snapshots.map(s => s.input).join('\n')); }, [runs, urls]);
  async function snap() { setBusy(true); setError(null);
    try { const r = await api<{ snapshots: Snap[] }>('/api/growth/competitors', { urls: urls.split('\n').map(s => s.trim()).filter(Boolean) }); const d = await store.save<Run>('competitors', { title: 'Competitor snapshot', data: { snapshots: r.snapshots, at: new Date().toISOString() } }); setRuns(x => [d, ...x]); toast('Snapshot saved'); }
    catch (e) { setError(e); } finally { setBusy(false); } }
  const cur = runs[0]?.data, prev = runs[1]?.data;
  return <div className="growth">
    <section className="panel">
      <h2 className="h2">Competitor tracker</h2>
      <p className="small muted">Snapshots each competitor&apos;s homepage and /pricing (title, headings, prices, calls to action) and shows what changed since the last snapshot. Run it weekly. No key needed.</p>
      {!!brand?.docs?.competitors.length && <p className="small muted">From your brief: {brand.docs.competitors.map(c => c.name).join(', ')}. Add their URLs below.</p>}
      <label className="label">Competitor URLs (one per line, up to 8)<textarea rows={6} value={urls} onChange={e => setUrls(e.target.value)} placeholder={'https://competitor-one.com\nhttps://competitor-two.io'} /></label>
      <button className="btn primary wide" disabled={busy || !urls.trim()} onClick={snap}>{busy ? <><span className="spin" />Snapshotting…</> : 'Take snapshot'}</button>
      <ErrorNote error={error} onClose={() => setError(null)} />
      {runs.length > 0 && <p className="small muted">{runs.length} snapshots saved · last {fmtDate(runs[0].data.at)}</p>}
    </section>
    <section className="docs">
      {!cur ? <div className="blank"><h3>Know when they change their pitch</h3><p>Pricing edits, new headlines and new calls to action, diffed week over week.</p></div> : cur.snapshots.map(s => {
        const before = prev?.snapshots.find(p => p.input === s.input); const ch = [...diff(before?.home, s.home), ...diff(before?.pricing, s.pricing).map(c => ({ ...c, field: `Pricing page: ${c.field}` }))];
        return <article key={s.input} className="card spaced"><div className="row between"><h3>{s.domain}</h3><span className={`chip ${ch.length ? 'bad' : before ? 'good' : ''}`}>{!before ? 'first snapshot' : ch.length ? `${ch.length} changes` : 'no change'}</span></div>
          {s.home.error ? <p className="small err-text">{s.home.error}</p> : <><p><b>{s.home.title}</b></p><p className="small muted">{s.home.desc}</p>
            <div className="chips">{s.home.heads?.slice(0, 5).map(h => <span key={h} className="chip">{h}</span>)}</div>
            <p className="small"><b>Pricing</b> {s.pricing.status === 200 ? (s.pricing.prices?.join(' · ') || 'no prices found on /pricing') : `(/pricing returned ${s.pricing.status || 'error'})`}{!!s.home.prices?.length && ` · homepage: ${s.home.prices.join(' · ')}`}</p>
            {!!s.home.ctas?.length && <p className="small muted">CTAs: {s.home.ctas.join(' · ')}</p>}</>}
          {!s.home.error && <div className="nextbar"><span>Beat them</span><Acts items={[
            ['Beat this competitor: build landing page', () => act({ kind: 'build', title: `Us vs ${s.domain}`, prompt: beatPrompt(s, briefFor(brand)), from: `Competitor ${s.domain}`, autorun: true })],
            ['Write counter-campaign', () => act({ kind: 'campaign', goal: `Win buyers comparing us with ${s.domain} (their pitch: "${s.home.title ?? ''}"; prices: ${[...(s.pricing.prices ?? []), ...(s.home.prices ?? [])].slice(0, 5).join(', ') || 'unpublished'})`, from: `Competitor ${s.domain}`, autorun: true })],
            ['Make a comparison ad', () => act({ kind: 'ad', angle: `Honest comparison against ${s.domain}: where they fall short for our buyers. No unverifiable claims.`, from: `Competitor ${s.domain}` })],
            ['Write "alternative to" article', () => act({ kind: 'article', topic: `${s.domain.split('.')[0]} alternatives`, angle: 'Honest comparison, including when they are the better choice', from: `Competitor ${s.domain}` })]]} /></div>}
          {ch.map((c, i) => <div key={i} className="quote small"><b>{c.field}</b><p className="err-text">− {c.before || '(none)'}</p><p className="ok-text">+ {c.after || '(none)'}</p></div>)}
        </article>; })}
    </section>
  </div>;
}
