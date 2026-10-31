'use client';
import { useEffect, useState } from 'react';
import Icon from '../Icon';
/** Sidebar credits balance + account shortcuts. Refreshes after every AI call. */
export default function CreditsPill({ onOpen, onTour }: { onOpen: () => void; onTour: () => void }) {
  const [u, setU] = useState<{ remaining: number; allowance: number } | null>(null); const [menu, setMenu] = useState(false);
  useEffect(() => { let t: ReturnType<typeof setTimeout>; const load = () => { clearTimeout(t); t = setTimeout(() => fetch('/api/credits', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(setU).catch(() => {}), 400); };
    load(); window.addEventListener('ikarvo:credits', load); return () => window.removeEventListener('ikarvo:credits', load); }, []);
  return <div className="credits-pill" data-tour="credits">
    <button className="btn ghost sm wide" onClick={onOpen} title="View credit usage"><Icon name="bolt" />{u ? `${u.remaining} / ${u.allowance} credits` : 'Credits'}</button>
    <button className="btn ghost sm icon" aria-label="More" onClick={() => setMenu(!menu)}>⋯</button>
    {menu && <div className="menu" onMouseLeave={() => setMenu(false)}><button onClick={() => { setMenu(false); onTour(); }}>Product tour</button><button onClick={() => { setMenu(false); onOpen(); }}>Credit usage</button><a href="/app?view=settings&tab=integrations">Integrations</a><a href="/app?view=settings&tab=personalization">Personalization</a></div>}
  </div>;
}
