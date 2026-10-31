'use client';
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import type { Status } from '@/lib/client/api';
import { ApiError } from '@/lib/client/api';
import type { Store } from '@/lib/client/store';

type Toast = { id: number; text: string; tone: 'ok' | 'err'; out?: boolean };
/** Cross-module handoff: one section prefills another, so the product works as one flow. */
export type Handoff =
  | { kind: 'build'; prompt: string; title?: string; from: string; autorun?: boolean }
  | { kind: 'ad'; product?: string; audience?: string; angle: string; from: string }
  | { kind: 'post'; text: string; channel?: string; from: string }
  | { kind: 'article'; topic: string; angle?: string; from: string }
  | { kind: 'campaign'; goal: string; product?: string; audience?: string; from: string; autorun?: boolean }
  | { kind: 'tab'; tab: string; from: string };
const TARGET: Record<Handoff['kind'], [string, string?]> = { build: ['build'], ad: ['ads'], post: ['marketing', 'calendar'], article: ['marketing', 'articles'], campaign: ['marketing', 'campaign'], tab: ['marketing'] };
export const MARKETING_TABS = ['strategy', 'crawl', 'visibility', 'competitors', 'community', 'articles', 'campaign', 'listing', 'voice', 'ugc', 'calendar', 'influencers', 'backlinks', 'hn', 'analytics', 'report', 'tools', 'email', 'launch', 'budget', 'meta'];
type Ctx = { go: (view: string, tab?: string) => void; handoff: Handoff | null; act: (h: Handoff) => void; take: <K extends Handoff['kind']>(k: K) => Extract<Handoff, { kind: K }> | null; status: Status; store: Store; email: string; toast: (text: string, tone?: 'ok' | 'err') => void; openProject: (id: string) => void; pendingProject: string | null; clearPending: () => void };
const C = createContext<Ctx | null>(null);
export const useWs = () => { const c = useContext(C); if (!c) throw new Error('Workspace context missing'); return c; };

export function WsProvider({ status, store, email, children, onOpenProject, onGo }: { status: Status; store: Store; email: string; children: ReactNode; onOpenProject: () => void; onGo: (view: string, tab?: string) => void }) {
  const [handoff, setHandoff] = useState<Handoff | null>(null);
  const act = useCallback((h: Handoff) => { setHandoff(h); const [v, t] = TARGET[h.kind]; onGo(v, h.kind === 'tab' ? h.tab : t); }, [onGo]);
  const take = useCallback(<K extends Handoff['kind']>(k: K) => { if (handoff?.kind !== k) return null; const h = handoff; setHandoff(null); return h as Extract<Handoff, { kind: K }>; }, [handoff]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pendingProject, setPending] = useState<string | null>(null);
  const toast = useCallback((text: string, tone: 'ok' | 'err' = 'ok') => {
    const id = Date.now() + Math.random(); setToasts(t => [...t, { id, text, tone }]);
    setTimeout(() => setToasts(t => t.map(x => x.id === id ? { ...x, out: true } : x)), 4000);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4200);
  }, []);
  return <C.Provider value={{ go: onGo, handoff, act, take, status, store, email, toast, pendingProject, clearPending: () => setPending(null), openProject: (id) => { setPending(id); onOpenProject(); } }}>
    {children}
    <div className="toasts" aria-live="polite">{toasts.map(t => <div key={t.id} role={t.tone === 'err' ? 'alert' : 'status'} className={`toast ${t.tone}${t.out ? ' out' : ''}`}><i aria-hidden>{t.tone === 'ok' ? '✓' : '!'}</i>{t.text}</div>)}</div>
  </C.Provider>;
}

/** Error panel that lists exactly which env vars are needed. */
export function ErrorNote({ error, onClose }: { error: unknown; onClose?: () => void }) {
  if (!error) return null;
  const e = error instanceof ApiError ? error : new ApiError(error instanceof Error ? error.message : String(error));
  return <div className={`note ${e.setup ? 'setup' : 'err'}`} role="alert">
    <div><strong>{e.setup ? 'Setup needed' : 'Something went wrong'}</strong><p>{e.message}</p>
      {e.setup && <div className="envs">{e.setup.map(k => <code key={k}>{k}</code>)}</div>}</div>
    {onClose && <button className="btn ghost sm icon" onClick={onClose} aria-label="Dismiss">×</button>}
  </div>;
}

export function Pill({ ok, children }: { ok: boolean; children: ReactNode }) { return <span className={`pill ${ok ? 'on' : 'off'}`}><i />{children}</span>; }

/** Banner shown in a section that was opened from another section. */
export function FromNote({ from, children, onClose }: { from: string; children?: ReactNode; onClose: () => void }) {
  return <div className="note handoff" role="status"><div><strong>Opened from {from}</strong>{children && <p>{children}</p>}</div><button className="btn ghost sm icon" onClick={onClose} aria-label="Dismiss">×</button></div>;
}
/** Row of one-click "do something about this" buttons. */
export function Acts({ items }: { items: ([string, () => void] | false | null | undefined)[] }) {
  return <div className="acts">{items.filter(Boolean).map(i => { const [l, f] = i as [string, () => void]; return <button key={l} className="btn act sm" onClick={e => { e.stopPropagation(); f(); }}>{l} →</button>; })}</div>;
}
