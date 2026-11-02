'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const KEY = 'ikarvo-cookie-notice';

export default function CookieNotice() {
  const [show, setShow] = useState(false);
  useEffect(() => { try { setShow(!localStorage.getItem(KEY)); } catch { /* storage blocked */ } }, []);
  if (!show) return null;
  const close = () => { try { localStorage.setItem(KEY, '1'); } catch { /* ignore */ } setShow(false); };
  return (
    <div role="region" aria-label="Cookie notice" style={{ position: 'fixed', left: 12, right: 12, bottom: 12, zIndex: 1000, maxWidth: 560, margin: '0 auto', padding: '12px 16px', borderRadius: 12, background: 'var(--bg-elev, #111)', color: 'inherit', border: '1px solid rgba(127,127,127,.3)', boxShadow: '0 8px 30px rgba(0,0,0,.25)', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', fontSize: 13.5 }}>
      <span style={{ flex: 1, minWidth: 200 }}>We use only essential cookies for sign-in and security. No ad or tracking cookies. See our <Link href="/legal/cookies">Cookie Policy</Link>.</span>
      <button type="button" className="btn primary sm" onClick={close}>Got it</button>
    </div>
  );
}
