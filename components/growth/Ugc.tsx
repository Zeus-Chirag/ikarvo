'use client';
import { useEffect, useState } from 'react';
import Icon from '../Icon';
import { useWs, ErrorNote, Acts } from '../ws';
import { api, fmtDate } from '@/lib/client/api';
import type { Doc } from '@/lib/client/store';
import { cachedSettings } from '@/lib/client/settings';
import { useBrand, briefFor } from './useBrand';

type Draft = { title: string; persona: string; setting: string; hook: string; script: { t: string; line: string; shot: string }[]; caption: string; hashtags: string[]; videoPrompt: string; job?: { id: string; status: string; output?: string[]; error?: string } };
/** UGC agent: creator-style short video drafts; render with the configured media provider. */
export default function Ugc() {
  const { store, status, toast, act } = useWs(); const { brand } = useBrand();
  const [count, setCount] = useState(3); const [platform, setPlatform] = useState(() => cachedSettings().agents.ugc.platform); const [list, setList] = useState<Doc<Draft>[]>([]);
  const [busy, setBusy] = useState(''); const [error, setError] = useState<unknown>(null);
  useEffect(() => { store.list<Draft>('ugc').then(setList).catch(() => {}); }, [store]);
  async function gen() { setBusy('gen'); setError(null);
    try { const r = await api<{ result: { drafts: Draft[] } }>('/api/growth/ugc', { count, platform, brief: briefFor(brand, 'ugc'), language: cachedSettings().personal.language });
      const saved: Doc<Draft>[] = []; for (const d of r.result.drafts ?? []) saved.push(await store.save<Draft>('ugc', { title: d.title, data: d })); setList(l => [...saved, ...l]); toast(`${saved.length} UGC drafts ready`); }
    catch (e) { setError(e); } finally { setBusy(''); } }
  async function render(d: Doc<Draft>) { setBusy(d.id); setError(null);
    try { const j = await api<{ id: string; status: string; output?: string[] }>('/api/media', { kind: 'video', prompt: d.data.videoPrompt, aspect: '9:16' }); const s = await store.save<Draft>('ugc', { id: d.id, title: d.title, data: { ...d.data, job: j } }); setList(l => l.map(x => x.id === s.id ? s : x)); toast('Render started'); }
    catch (e) { setError(e); } finally { setBusy(''); } }
  async function refresh(d: Doc<Draft>) { if (!d.data.job) return; try { const j = await api<{ id: string; status: string; output?: string[]; error?: string }>(`/api/media/${encodeURIComponent(d.data.job.id)}`); const s = await store.save<Draft>('ugc', { id: d.id, title: d.title, data: { ...d.data, job: j } }); setList(l => l.map(x => x.id === s.id ? s : x)); } catch (e) { setError(e); } }
  return <div className="growth">
    <section className="panel">
      <h2 className="h2">UGC video agent</h2>
      <p className="small muted">Writes phone-shot, creator-style video drafts: persona, setting, hook, timed script with shots, caption. Personas are archetypes, never fake customers. Footage renders through your media provider.</p>
      <div className="two"><label className="label">Drafts<input className="input" type="number" min={1} max={6} value={count} onChange={e => setCount(Number(e.target.value))} /></label>
        <label className="label">Platform<select className="input" value={platform} onChange={e => setPlatform(e.target.value)}>{['TikTok', 'Instagram Reels', 'YouTube Shorts'].map(p => <option key={p}>{p}</option>)}</select></label></div>
      <button className="btn primary wide" disabled={!!busy} onClick={gen}>{busy === 'gen' ? <><span className="spin" />Writing drafts…</> : 'Write UGC drafts'}</button>
      {!status.ai.ok && <p className="small muted">Needs <code>AI_API_KEY</code>. Rendering needs <code>REPLICATE_API_TOKEN</code> or <code>FAL_KEY</code>.</p>}
      <ErrorNote error={error} onClose={() => setError(null)} />
    </section>
    <section className="docs">
      {!list.length ? <div className="blank"><h3>Short videos that look filmed, not produced</h3><p>Drafts land here for review. Nothing posts on its own.</p></div> : list.map(d => <article key={d.id} className="card spaced">
        <div className="row between"><h3>{d.data.title}</h3><span className="small muted">{fmtDate(d.updated_at)}</span></div>
        <p className="small muted">{d.data.persona} · {d.data.setting}</p><p><b>Hook:</b> {d.data.hook}</p>
        <div className="table">{d.data.script?.map((s, i) => <div key={i} className="tr ab"><span className="chip">{s.t}</span><span>{s.line}</span><span className="small muted">{s.shot}</span></div>)}</div>
        <p className="small">{d.data.caption} <span className="muted">{d.data.hashtags?.map(h => `#${h.replace(/^#/, '')}`).join(' ')}</span></p>
        {d.data.job && <p className="small">Render job {d.data.job.id}: {d.data.job.status}{d.data.job.error && ` · ${d.data.job.error}`}{d.data.job.output?.[0] && <> · <a className="link" href={d.data.job.output[0]} target="_blank" rel="noreferrer">open video</a></>} <button className="btn ghost sm" onClick={() => refresh(d)}>Check status</button></p>}
        <Acts items={[['Render video', () => render(d)], ['Schedule as post', () => act({ kind: 'post', text: `${d.data.hook}\n\n${d.data.caption}`, channel: 'TikTok', from: 'UGC agent' })], ['Open in Ad Studio', () => act({ kind: 'ad', angle: `${d.data.hook} (UGC, ${d.data.persona})`, from: 'UGC agent' })]]} />
        <button className="btn ghost sm" onClick={() => { navigator.clipboard.writeText(d.data.script.map(s => `${s.t} ${s.line} [${s.shot}]`).join('\n')); toast('Script copied'); }}><Icon name="copy" />Copy script</button>
      </article>)}
    </section>
  </div>;
}
