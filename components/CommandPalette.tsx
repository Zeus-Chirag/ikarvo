'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from './Icon';

export type Cmd = { id: string; label: string; group: string; icon: string; hint?: string; run: () => void };

/** ⌘K / Ctrl+K palette. Opens fast (180ms), keyboard-first, mouse follows. */
export default function CommandPalette({ commands, open, setOpen }: { commands: Cmd[]; open: boolean; setOpen: (o: boolean) => void }) {
  const [q, setQ] = useState(''); const [i, setI] = useState(0);
  const input = useRef<HTMLInputElement>(null); const back = useRef<Element | null>(null); const list = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const on = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen(!open); } };
    window.addEventListener('keydown', on); return () => window.removeEventListener('keydown', on);
  }, [open, setOpen]);
  useEffect(() => { if (open) { back.current = document.activeElement; setQ(''); setI(0); requestAnimationFrame(() => input.current?.focus()); } else (back.current as HTMLElement | null)?.focus?.(); }, [open]);
  const shown = useMemo(() => { const t = q.trim().toLowerCase(); return t ? commands.filter(c => (c.label + ' ' + c.group + ' ' + (c.hint ?? '')).toLowerCase().includes(t)) : commands; }, [q, commands]);
  useEffect(() => { list.current?.querySelector(`[data-i="${i}"]`)?.scrollIntoView({ block: 'nearest' }); }, [i]);
  if (!open) return null;
  const run = (c?: Cmd) => { if (!c) return; setOpen(false); c.run(); };
  const key = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setI(x => Math.min(shown.length - 1, x + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setI(x => Math.max(0, x - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); run(shown[i]); }
  };
  let last = ''; const rows: React.ReactNode[] = [];
  shown.forEach((c, n) => { if (c.group !== last) { last = c.group; rows.push(<div key={'g' + c.group} className="cmdk-grp" role="presentation">{c.group}</div>); }
    rows.push(<button key={c.id} id={'cmd-' + c.id} data-i={n} role="option" aria-selected={n === i} className={`cmdk-item ${n === i ? 'on' : ''}`} onMouseMove={() => setI(n)} onClick={() => run(c)}><Icon name={c.icon} />{c.label}{c.hint && <small>{c.hint}</small>}</button>); });
  return <div className="cmdk-bg" onMouseDown={e => { if (e.target === e.currentTarget) setOpen(false); }}>
    <div className="cmdk" role="dialog" aria-modal="true" aria-label="Command menu" onKeyDown={key}>
      <div className="cmdk-in"><Icon name="search" /><input ref={input} value={q} onChange={e => { setQ(e.target.value); setI(0); }} placeholder="Jump to a page, tab or action…" aria-label="Search commands" role="combobox" aria-expanded="true" aria-controls="cmdk-list" aria-activedescendant={shown[i] ? 'cmd-' + shown[i].id : undefined} /><kbd>Esc</kbd></div>
      <div className="cmdk-list" id="cmdk-list" role="listbox" ref={list}>{rows.length ? rows : <p className="cmdk-none">No matches for “{q}”.</p>}</div>
      <div className="cmdk-foot"><span><kbd>↑</kbd><kbd>↓</kbd> move</span><span><kbd>↵</kbd> open</span><span><kbd>Esc</kbd> close</span></div>
    </div>
  </div>;
}
