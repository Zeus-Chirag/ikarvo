'use client';
import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';
const KEY = 'ikarvo:theme';
/** Runs before first paint (inlined in <head>) so there is no flash of the wrong theme. */
export const THEME_BOOT = `try{var t=localStorage.getItem('${KEY}');if(!t)t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.dataset.theme=t}catch(e){}`;

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const [t, setT] = useState<Theme | null>(null);
  useEffect(() => { setT((document.documentElement.dataset.theme as Theme) || 'light'); }, []);
  const flip = () => { const n: Theme = t === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = n; try { localStorage.setItem(KEY, n); } catch {} setT(n); };
  const dark = t === 'dark';
  return <button type="button" className={`theme-toggle ${className}`} onClick={flip} aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'} title={dark ? 'Light theme' : 'Dark theme'} aria-pressed={dark}>
    {dark ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
      : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" /></svg>}
  </button>;
}
