'use client';
import { useEffect, useState } from 'react';
import Icon from '../Icon';
import { useWs, ErrorNote } from '../ws';
import { api, download } from '@/lib/client/api';
import type { Doc } from '@/lib/client/store';
import { useBrand, briefFor } from './useBrand';

type Task = { day: number; task: string; channel: string; owner: string; tab: string; done_when: string; done?: boolean };
type Plan = { launchDate: string; narrative: string; phases: { name: string; window: string; tasks: Task[] }[]; risks: string[]; successMetrics: { metric: string; target: string }[] };
/** Launch run-sheet T-14 → T+14. Every task opens the tab that does it; ticks persist. Export .ics with one event per task. */
export default function LaunchPlan() {
  const { store, toast, go } = useWs(); const { brand } = useBrand();
  const [what, setWhat] = useState(''); const [date, setDate] = useState(() => new Date(Date.now() + 21 * 864e5).toISOString().slice(0, 10)); const [budget, setBudget] = useState('');
  const [doc, setDoc] = useState<Doc<Plan> | null>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState<unknown>(null);
  useEffect(() => { store.list<Plan>('launches').then(l => setDoc(l[0] ?? null)).catch(() => {}); }, [store]);
  async function gen() { setBusy(true); setError(null); try { const r = await api<{ result: Plan }>('/api/growth/launch', { what, date, budget, brief: briefFor(brand) }); setDoc(await store.save<Plan>('launches', { title: `Launch ${date}`, data: { ...r.result, launchDate: date } })); toast('Launch plan ready'); } catch (e) { setError(e); } finally { setBusy(false); } }
  async function tick(pi: number, ti: number) { if (!doc) return; const d = structuredClone(doc.data); d.phases[pi].tasks[ti].done = !d.phases[pi].tasks[ti].done; setDoc(await store.save<Plan>('launches', { id: doc.id, title: doc.title, data: d })); }
  const p = doc?.data; const all = p?.phases.flatMap(x => x.tasks) ?? []; const done = all.filter(t => t.done).length;
  const at = (day: number) => { const d = new Date(`${p?.launchDate ?? date}T09:00:00`); d.setDate(d.getDate() + day); return d; };
  const ics = () => { const f = (d: Date) => d.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
    download('launch-plan.ics', ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Ikarvo//Launch//EN', ...all.flatMap((t, i) => ['BEGIN:VEVENT', `UID:launch-${i}-${Date.now()}@ikarvo`, `DTSTAMP:${f(new Date())}`, `DTSTART:${f(at(t.day))}`, `DTEND:${f(new Date(at(t.day).getTime() + 36e5))}`, `SUMMARY:${t.task.replace(/[,;\n]/g, ' ')}`, `DESCRIPTION:${t.channel} · done when ${t.done_when.replace(/[,;\n]/g, ' ')}`, 'END:VEVENT']), 'END:VCALENDAR'].join('\r\n'), 'text/calendar'); };
  return <div className="growth">
    <section className="panel"><h2 className="h2">Launch plan</h2>
      <p className="small muted">A day-by-day run-sheet around launch day. Each task links to the tool that does it.</p>
      <label className="label">What is launching<textarea rows={3} value={what} onChange={e => setWhat(e.target.value)} placeholder="e.g. v2 with team workspaces" /></label>
      <div className="two"><label className="label">Launch day<input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} /></label><label className="label">Budget<input className="input" value={budget} onChange={e => setBudget(e.target.value)} placeholder="$0 / $2k ads" /></label></div>
      <button className="btn primary wide" disabled={busy} onClick={gen}>{busy ? <><span className="spin" />Planning…</> : 'Build launch plan · 8 cr'}</button>
      <ErrorNote error={error} onClose={() => setError(null)} />
    </section>
    <section className="docs">{!p ? <div className="blank"><h3>Launch with a plan, not a post</h3><p>Two weeks before to two weeks after, with owners and a clear finish line per task.</p></div> : <>
      <div className="row between"><div><h3>{doc?.title}</h3><p className="small muted">{p.narrative}</p></div><div className="row"><span className="chip">{done}/{all.length} done</span><button className="btn ghost sm" onClick={ics}><Icon name="calendar" />.ics</button></div></div>
      <div className="meter"><i style={{ width: `${all.length ? done / all.length * 100 : 0}%` }} /></div>
      {p.phases.map((ph, pi) => <div key={pi} className="phase"><h4>{ph.name} <span className="muted small">· {ph.window}</span></h4>
        {ph.tasks.map((t, ti) => <div key={ti} className={`task ${t.done ? 'done' : ''}`}><input type="checkbox" checked={!!t.done} onChange={() => tick(pi, ti)} /><span className="chip">{t.day === 0 ? 'Launch' : t.day > 0 ? `T+${t.day}` : `T${t.day}`}</span>
          <div><b>{t.task}</b><p className="small muted">{t.channel} · {t.owner} · done when {t.done_when}</p></div>{t.tab && <button className="btn ghost sm" onClick={() => go('marketing', t.tab)}>Open →</button>}</div>)}</div>)}
      <div className="two"><div><h4>Risks</h4><ul className="ticks small">{p.risks.map(r => <li key={r}>{r}</li>)}</ul></div><div><h4>Success metrics (assumptions)</h4><ul className="ticks small">{p.successMetrics.map(m => <li key={m.metric}>{m.metric}: {m.target}</li>)}</ul></div></div></>}</section>
  </div>;
}
