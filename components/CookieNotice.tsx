'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const KEY = 'ikarvo-cookie-notice';

export default function CookieNotice() {
  // Rendered in the server HTML so it paints with the page instead of popping in after hydration
  // (it was the late LCP element). An inline script hides it before first paint for returning visitors.
  const [show, setShow] = useState(true);
  useEffect(() => { try { if (localStorage.getItem(KEY)) setShow(false); } catch { /* storage blocked */ } }, []);
  if (!show) return null;
  const close = () => { try { localStorage.setItem(KEY, '1'); } catch { /* ignore */ } setShow(false); };
  return (
    <div id="ck-note" suppressHydrationWarning role="region" aria-label="Cookie notice" style={{ position: 'fixed', left: 12, right: 12, bottom: 12, zIndex: 1000, maxWidth: 560, margin: '0 auto', padding: '12px 16px', borderRadius: 12, background: 'var(--paper)', color: 'var(--ink)', border: '1px solid rgba(127,127,127,.3)', boxShadow: '0 8px 30px rgba(0,0,0,.25)', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', fontSize: 13.5 }}>
      <span style={{ flex: 1, minWidth: 200 }}>We use only essential cookies for sign-in and security. No ad or tracking cookies. See our <Link href="/legal/cookies">Cookie Policy</Link>.</span>
      <button type="button" className="btn primary sm" onClick={close}>Got it</button>
      <script dangerouslySetInnerHTML={{ __html: `try{if(localStorage.getItem('${KEY}'))document.getElementById('ck-note').style.display='none'}catch(e){}` }} />
    </div>
  );
}
