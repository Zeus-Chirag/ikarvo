'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ACCEPT, readText } from '@/lib/client/extract';
import Icon from '../Icon';
import { useWs, ErrorNote, type Handoff } from '../ws';
import { api } from '@/lib/client/api';
import type { Doc } from '@/lib/client/store';
import { mdToHtml } from '@/lib/markdown';
import { AGENTS, type Settings } from '@/lib/client/settings';
import { briefFor, type Brand } from '../growth/useBrand';

type Action = { label: string; kind: Handoff['kind']; prompt?: string; angle?: string; text?: string; channel?: string; topic?: string; goal?: string; tab?: string };
type Msg = { role: 'user' | 'cmo'; content: string; actions?: Action[]; at: string };
type Thread = { messages: Msg[] };
const SUGGEST = ["What's my 30-day plan, in order of impact?", 'Who exactly is my best customer, and what pain do I lead with?', 'How do I stand out from my competitors?', 'Rewrite my one-liner three ways', 'What should I fix on my site first?', 'How do I grow organic traffic in the next 90 days?', 'Write a LinkedIn post about our launch'];
const CHIPS = [['Plan next 30 days', "Plan my next 30 days. Prioritize by impact and effort."], ['Find my customer', 'Describe my best customer and where to find them.'], ['Compare with competitors', 'Compare us with my competitors and tell me where we win.']];

function toHandoff(a: Action): Handoff | null {
  const from = 'AI CMO chat';
  switch (a.kind) {
    case 'build': return a.prompt ? { kind: 'build', prompt: a.prompt, from } : null;
    case 'ad': return { kind: 'ad', angle: a.angle || a.text || a.label, from };
    case 'post': return a.text ? { kind: 'post', text: a.text, channel: a.channel, from } : null;
    case 'article': return a.topic ? { kind: 'article', topic: a.topic, from } : null;
    case 'campaign': return { kind: 'campaign', goal: a.goal || a.label, from, autorun: true };
    case 'tab': return a.tab ? { kind: 'tab', tab: a.tab, from } : null;
    default: return null;
  }
}

export default function Chat({ brand, docs, settings, onClose }: { brand: Brand; docs: Record<string, unknown>; settings: Settings; onClose: () => void }) {
  const { store, act, go, status, toast } = useWs();
  const [threads, setThreads] = useState<Doc<Thread>[]>([]); const [cur, setCur] = useState<Doc<Thread> | null>(null); const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState<unknown>(null); const [focus, setFocus] = useState(false); const [hi, setHi] = useState(0);
  const [history, setHistory] = useState(false); const [suggest, setSuggest] = useState<string[]>(SUGGEST); const [attach, setAttach] = useState<{ name: string; text: string } | null>(null);
  const [memories, setMemories] = useState<Doc<{ text: string }>[]>([]); const [skills, setSkills] = useState<Doc<{ name: string; body: string }>[]>([]);
  const list = useRef<HTMLDivElement>(null); const box = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { store.list<Thread>('chats').then(setThreads).catch(() => {}); store.list<{ text: string }>('memories').then(setMemories).catch(() => {}); store.list<{ name: string; body: string }>('skills').then(setSkills).catch(() => {}); }, [store]);
  useEffect(() => { list.current?.scrollTo({ top: 1e6, behavior: 'smooth' }); }, [msgs, busy]);
  const mentionables = useMemo(() => [...Object.keys(docs), ...AGENTS.map(a => a.name)], [docs]);
  const at = input.match(/@([\w ]*)$/); const mentionList = at ? mentionables.filter(m => m.toLowerCase().startsWith(at[1].toLowerCase())).slice(0, 6) : [];
  const menu = mentionList.length ? mentionList : !input && focus ? suggest : [];
  const pick = (v: string) => { if (mentionList.length) setInput(input.replace(/@[\w ]*$/, `@${v} `)); else setInput(v); setHi(0); box.current?.focus(); };

  async function send(text = input) {
    if (!text.trim() || busy) return; const userMsg: Msg = { role: 'user', content: attach ? `${text}\n\n[Attached: ${attach.name}]` : text, at: new Date().toISOString() };
    const next = [...msgs, userMsg]; setMsgs(next); setInput(''); setBusy(true); setError(null);
    const focusDoc = mentionables.find(m => text.includes(`@${m}`));
    try {
      const r = await api<{ reply: string; actions?: Action[]; suggestions?: string[]; memory?: string | null }>('/api/cmo/chat', {
        messages: next.map(m => ({ role: m.role, content: m.content })).concat(attach ? [{ role: 'user', content: `Attached file ${attach.name}:\n${attach.text.slice(0, 8000)}` }] : []),
        brief: briefFor(brand), docs: focusDoc && docs[focusDoc] ? { [focusDoc]: docs[focusDoc] } : docs, focus: focusDoc, memories: memories.map(m => m.data.text), skills: skills.map(s => `${s.data.name}: ${s.data.body.slice(0, 1500)}`),
        agents: Object.fromEntries(Object.entries(settings.agents).map(([k, v]) => [k, v.on])), language: settings.personal.language, callMe: settings.personal.callMe, role: settings.personal.role, about: settings.personal.about });
      const reply: Msg = { role: 'cmo', content: r.reply, actions: (r.actions ?? []).filter(a => toHandoff(a)).slice(0, 3), at: new Date().toISOString() }; const all = [...next, reply]; setMsgs(all); setAttach(null);
      if (r.suggestions?.length) setSuggest(r.suggestions.slice(0, 6));
      if (r.memory) { const m = await store.save<{ text: string }>('memories', { title: r.memory.slice(0, 60), data: { text: r.memory } }); setMemories(x => [m, ...x]); }
      const d = await store.save<Thread>('chats', { id: cur?.id, title: (cur?.title || next[0].content).slice(0, 80), data: { messages: all } }); setCur(d); setThreads(t => [d, ...t.filter(x => x.id !== d.id)]);
    } catch (e) { setError(e); setMsgs(msgs); setInput(text); } finally { setBusy(false); }
  }
  const onKey = (e: React.KeyboardEvent) => {
    if (menu.length && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { e.preventDefault(); setHi(h => (h + (e.key === 'ArrowDown' ? 1 : -1) + menu.length) % menu.length); return; }
    if (menu.length && e.key === 'Enter' && !e.shiftKey && (mentionList.length || !input)) { e.preventDefault(); pick(menu[hi]); return; }
    if (e.key === 'Escape') { setFocus(false); return; }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };
  return <aside className="chat" data-tour="chat">
    <div className="row between chat-head"><b>AI CMO</b><div className="row">
      <button className="btn ghost sm icon" title="New chat" onClick={() => { setCur(null); setMsgs([]); setHistory(false); }}><Icon name="plus" /></button>
      <button className="btn ghost sm icon" title="Chat history" onClick={() => setHistory(!history)}><Icon name="calendar" /></button>
      <button className="btn ghost sm icon" title="Notifications (Telegram / WhatsApp)" onClick={() => go('settings', 'integrations')}><Icon name="plug" /></button>
      <button aria-label="Close" className="btn ghost sm icon" title="Hide" onClick={onClose}>×</button></div></div>
    {history ? <div className="chat-list">{threads.length ? threads.map(t => <button key={t.id} className="starter" onClick={() => { setCur(t); setMsgs(t.data.messages); setHistory(false); }}><span>{t.title}</span></button>) : <p className="small muted">No past chats.</p>}</div> : <>
      <div className="chat-msgs" ref={list}>
        {!msgs.length && <div className="chat-hello"><p>Hi. I&apos;ve read {brand.docs?.product.name ?? brand.url} and everything in your Context panel. Where should we start?</p><div className="chips">{CHIPS.map(([l, q]) => <button key={l} className="chip btnchip" onClick={() => send(q)}>{l}</button>)}</div>
          <p className="small muted">Type <b>@</b> to point me at one document or agent. I suggest actions; you click them. I never publish or send anything.</p>{!status.ai.ok && <p className="small err-text">Chat needs AI_API_KEY.</p>}</div>}
        {msgs.map((m, i) => <div key={i} className={`msg ${m.role}`}>{m.role === 'cmo' ? <div className="prose small" dangerouslySetInnerHTML={{ __html: mdToHtml(m.content) }} /> : <p className="pre">{m.content}</p>}
          {!!m.actions?.length && <div className="acts">{m.actions.map((a, j) => <button key={j} className="btn act sm" onClick={() => { const h = toHandoff(a); if (h) act(h); }}>{a.label} →</button>)}</div>}</div>)}
        {busy && <div className="msg cmo"><span className="spin" /> thinking…</div>}
      </div>
      <ErrorNote error={error} onClose={() => setError(null)} />
      <div className="chat-input">
        {!!menu.length && <div className="suggest" role="listbox">{menu.map((s, i) => <button key={s} role="option" aria-selected={i === hi} className={i === hi ? 'on' : ''} onMouseDown={e => { e.preventDefault(); pick(s); }}>{mentionList.length ? '@' : ''}{s}</button>)}<span className="small muted">↑↓ browse · ↵ insert · esc close</span></div>}
        {attach && <span className="chip">{attach.name} <button className="btn ghost sm icon" onClick={() => setAttach(null)}>×</button></span>}
        <textarea ref={box} rows={2} value={input} placeholder="Ask your CMO anything… (@ to mention)" onChange={e => { setInput(e.target.value); setHi(0); }} onKeyDown={onKey} onFocus={() => setFocus(true)} onBlur={() => setTimeout(() => setFocus(false), 150)} />
        <div className="row between"><div className="row">
          <label className="btn ghost sm icon" title="Attach a file (PDF, DOCX, text)" aria-label="Attach a file"><Icon name="clip" /><input type="file" hidden accept={ACCEPT} onChange={async e => { const f = e.target.files?.[0]; e.target.value = ''; if (!f) return; try { setAttach({ name: f.name, text: await readText(f) }); } catch (err) { toast(err instanceof Error ? err.message : String(err), 'err'); } e.target.value = ''; }} /></label>
          <button className="btn ghost sm icon" title="Mention a document or agent" onClick={() => { setInput(i => `${i}@`); box.current?.focus(); }}><Icon name="at" /></button></div>
          <span className="small muted">1 credit / message</span><button className="btn primary sm" disabled={busy || !input.trim()} onClick={() => send()}><Icon name="send" />Send</button></div>
      </div></>}
  </aside>;
}
