'use client';
import { useEffect, useLayoutEffect, useState } from 'react';
const STEPS: { sel?: string; title: string; body: string }[] = [
  { title: 'A quick tour', body: 'Two minutes on how Ikarvo runs your marketing. You can replay it any time from the account menu.' },
  { sel: '[data-tour=context]', title: 'Context is the source of truth', body: 'Your documents (product, strategy, competitors, calendar, design, content) and competitor list. Every agent reads from here, so edit it when your story changes.' },
  { sel: '[data-tour=agents]', title: 'One agent per channel', body: 'SEO, AI visibility, Reddit & HN, X, LinkedIn, articles, UGC, creators, backlinks, competitor intelligence, Show HN. "Setup" means a key or connection is missing.' },
  { sel: '[data-tour=toggle]', title: 'Switch agents on or off', body: 'Off agents stop appearing in your brief and chat. Per-channel instructions live in Settings → Agents.' },
  { sel: '[data-tour=brief]', title: 'Your daily brief', body: 'Every draft lands here. Approve a post and the scheduler publishes it at its time. Nothing goes out without your say-so.' },
  { sel: '[data-tour=chat]', title: 'Talk to your CMO', body: 'Ask for a plan, a post, a positioning rethink. Use @ to point at one document or agent. Suggested actions open the right tool prefilled.' },
  { sel: '[data-tour=scores]', title: 'Your site at a glance', body: 'Lighthouse scores from PageSpeed Insights, plus Search Console and GA4 once connected.' },
  { sel: '[data-tour=credits]', title: 'Credits', body: 'Each AI action costs a few credits; failed calls are refunded. Click to see the full breakdown in Settings → Credits.' },
  { title: "That's it", body: 'Start with the brief, approve a few drafts, and check the weekly report on Friday.' },
];
export default function Tour({ onEnd }: { onEnd: () => void }) {
  const [i, setI] = useState(0); const [box, setBox] = useState<DOMRect | null>(null); const s = STEPS[i];
  useLayoutEffect(() => { const el = s.sel ? document.querySelector(s.sel) : null; if (el) { el.scrollIntoView({ block: 'nearest' }); setBox(el.getBoundingClientRect()); } else setBox(null); }, [s.sel]);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onEnd(); if (e.key === 'ArrowRight') setI(x => Math.min(STEPS.length - 1, x + 1)); if (e.key === 'ArrowLeft') setI(x => Math.max(0, x - 1)); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onEnd]);
  const pos = box ? { top: Math.min(window.innerHeight - 220, box.bottom + 12), left: Math.min(window.innerWidth - 360, Math.max(12, box.left)) } : { top: window.innerHeight / 2 - 100, left: window.innerWidth / 2 - 170 };
  return <div className="tour" role="dialog" aria-label="Product tour">
    {box && <div className="tour-hole" style={{ top: box.top - 6, left: box.left - 6, width: box.width + 12, height: box.height + 12 }} />}
    <div className="tour-card" style={pos}><span className="small muted">{i + 1} / {STEPS.length}</span><h3>{s.title}</h3><p className="small">{s.body}</p>
      <div className="row between"><button className="btn ghost sm" onClick={onEnd}>Skip</button><div className="row">{i > 0 && <button className="btn ghost sm" onClick={() => setI(i - 1)}>Back</button>}<button className="btn primary sm" onClick={() => i === STEPS.length - 1 ? onEnd() : setI(i + 1)}>{i === STEPS.length - 1 ? 'Done' : i === 0 ? 'Take the tour' : 'Next'}</button></div></div></div>
  </div>;
}
