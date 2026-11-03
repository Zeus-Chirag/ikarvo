'use client';
import { Suspense, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Icon from './Icon';
import { WsProvider, ErrorNote } from './ws';
import { api, type Status } from '@/lib/client/api';
import { cloudStore, localStore, setActiveWorkspace, WS_KEY } from '@/lib/client/store';
import { createClient } from '@/lib/supabase/client';
import BuildStudio from './BuildStudio';
import Projects from './Projects';
import AdStudio from './ad/AdStudio';
import Marketing from './Marketing';
import Integrations from './Integrations';
import Billing from './Billing';
import Home from './cmo/Home';
import SettingsView from './cmo/Settings';
import CreditsPill from './cmo/CreditsPill';
import ThemeToggle from './ThemeToggle';
import CommandPalette, { type Cmd } from './CommandPalette';
import { MARKETING_TABS } from './ws';

const NAV = [
  { id: 'home', label: 'AI CMO', icon: 'home' }, { id: 'build', label: 'Build', icon: 'build' }, { id: 'projects', label: 'Projects', icon: 'folder' },
  { id: 'ads', label: 'Ad Studio', icon: 'film' }, { id: 'marketing', label: 'Marketing', icon: 'megaphone' },
  { id: 'integrations', label: 'Integrations', icon: 'plug' }, { id: 'billing', label: 'Billing & setup', icon: 'card' }, { id: 'settings', label: 'Settings', icon: 'settings' },
] as const;
type View = (typeof NAV)[number]['id'];

type Shared = { owner: string; ownerEmail: string; role: string };
function Shell({ status, email, mode, shared, active }: { status: Status; email: string; mode: 'local' | 'cloud'; shared: Shared[]; active: string | null }) {
  const params = useSearchParams(); const router = useRouter();
  const view = (NAV.some(n => n.id === params.get('view')) ? params.get('view') : 'home') as View;
  const go = (v: View, tab?: string) => { const nav = () => router.replace(`/app?view=${v}${tab ? `&tab=${tab}` : ''}`, { scroll: false });
    nav(); if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }); };
  const [k, setK] = useState(false);
  const cmds: Cmd[] = [
    ...NAV.map(n => ({ id: 'v-' + n.id, label: n.label, group: 'Go to', icon: n.icon, run: () => go(n.id) })),
    ...MARKETING_TABS.map(t => ({ id: 'm-' + t, label: t === 'hn' ? 'Hacker News' : t === 'meta' ? 'Meta Ads' : t[0].toUpperCase() + t.slice(1), group: 'Marketing', icon: t === 'meta' ? 'megaphone' : 'doc', hint: 'Marketing', run: () => go('marketing', t) })),
    { id: 'a-new', label: 'New app from a prompt', group: 'Actions', icon: 'plus', run: () => go('build') },
    { id: 'a-credits', label: 'Credits & usage', group: 'Actions', icon: 'bolt', run: () => go('settings', 'credits') },
    { id: 'a-team', label: 'Invite a teammate', group: 'Actions', icon: 'users', run: () => go('settings', 'team') },
    { id: 'a-theme', label: 'Toggle light / dark theme', group: 'Actions', icon: 'moon', run: () => { const d = document.documentElement; const n = d.dataset.theme === 'dark' ? 'light' : 'dark'; d.dataset.theme = n; try { localStorage.setItem('ikarvo:theme', n); } catch {} } },
  ];
  return <WsProvider status={status} store={mode === 'cloud' ? cloudStore : localStore} email={email} onOpenProject={() => go('build')} onGo={(v, t) => go(v as View, t)}>
    <div className="ws">
      <aside className="side">
        <Link href="/" className="wordmark">Ikar<em>vo</em></Link>
        <button className="side-k" onClick={() => setK(true)} aria-label="Open command menu (Ctrl+K)"><Icon name="search" /><span>Search or jump…</span><kbd>⌘K</kbd></button>
        <nav aria-label="Workspace">{NAV.map(n => <button key={n.id} className={view === n.id ? 'on' : ''} aria-current={view === n.id ? 'page' : undefined} onClick={() => go(n.id)}><Icon name={n.icon} />{n.label}</button>)}</nav>
        <div className="side-mobile-tools"><ThemeToggle /></div>
        <div className="side-foot">
          <div className="side-tools"><ThemeToggle /><span className="small muted">Theme</span></div>
          <CreditsPill onOpen={() => go('settings', 'credits')} onTour={() => { localStorage.setItem('ikarvo:tourNow', '1'); window.dispatchEvent(new Event('ikarvo:tour')); go('home'); }} />
          {status.preview && <div className="preview-tag">Preview mode<br /><span>Data stays in this browser</span></div>}
          {shared.length > 0 && <label className="label ws-switch">Workspace<select className="input sm" value={active ?? ''} onChange={e => { if (e.target.value) localStorage.setItem(WS_KEY, e.target.value); else localStorage.removeItem(WS_KEY); location.reload(); }}>
            <option value="">My workspace</option>{shared.map(w => <option key={w.owner} value={w.owner}>{w.ownerEmail || 'Shared workspace'} · {w.role}</option>)}</select></label>}
          <div className="who"><span className="avatar">{email.slice(0, 1).toUpperCase()}</span><span className="small">{email}</span>
            {mode === 'cloud' && <button className="btn ghost sm icon" title="Sign out" aria-label="Sign out" onClick={async () => { await createClient().auth.signOut(); location.href = '/'; }}><Icon name="logout" /></button>}</div>
        </div>
      </aside>
      <main className="main" id="main">
        <div key={view} className="view-enter">
        {view === 'home' && <Home />}{view === 'settings' && <SettingsView />}
        {view === 'projects' && <Projects />}{view === 'ads' && <AdStudio />}{view === 'marketing' && <Marketing />}
        {view === 'integrations' && <Integrations />}{view === 'billing' && <Billing />}
        </div>
        <div className={view === 'build' ? 'view-enter' : undefined} hidden={view !== 'build'}><BuildStudio /></div>
      </main>
      <CommandPalette commands={cmds} open={k} setOpen={setK} />
    </div>
  </WsProvider>;
}

function Boot() {
  return <div className="boot" aria-busy="true" aria-label="Loading workspace"><div className="boot-side"><span className="sk" style={{ height: 26, width: 90, marginBottom: 18 }} />{Array.from({ length: 8 }, (_, i) => <span key={i} className="sk" style={{ height: 30 }} />)}</div>
    <div className="boot-main"><span className="sk sk-line" style={{ width: 70 }} /><span className="sk sk-title" /><span className="sk sk-line" style={{ width: '55%' }} /><div className="boot-grid">{Array.from({ length: 6 }, (_, i) => <span key={i} className="sk sk-card" />)}</div></div></div>;
}

function AuthForm() {
  const [mode, setMode] = useState<'in' | 'up' | 'reset' | 'magic'>('in'); const [email, setEmail] = useState(''); const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState(''); const [error, setError] = useState<unknown>(null);
  useEffect(() => { const q = new URLSearchParams(location.search); const m = q.get('mode'); if (m === 'up' || m === 'signup') setMode('up'); else if (m === 'reset' || m === 'forgot') setMode('reset'); else if (m === 'magic') setMode('magic');
    if (q.get('authError')) setError(new Error('That link has expired or was already used. If you just confirmed your email, sign in below. Otherwise, request a new link.')); }, []);
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError(null); setMsg('');
    const sb = createClient(); const redirect = `${location.origin}/auth/callback?next=${encodeURIComponent(mode === 'reset' ? '/app?reset=1' : '/app')}`;
    try {
      if (mode === 'reset') { const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: redirect }); if (error) throw error; setMsg(`Check your inbox. If ${email} has an account, we just sent a password reset link. Open it in this browser to choose a new password.`); }
      else if (mode === 'magic') { const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: redirect, shouldCreateUser: false } }); if (error && !/signups? not allowed|not found/i.test(error.message)) throw error; setMsg(`Check your inbox. If ${email} has an account, we just sent a sign-in link. Open it in this browser.`); }
      else if (mode === 'up') { const { data, error } = await sb.auth.signUp({ email, password: pw, options: { emailRedirectTo: redirect } }); if (error) throw error;
        // Supabase returns a fake success (no identities, no email sent) when the address is already registered.
        if (!data.session && data.user && (data.user.identities?.length ?? 0) === 0) throw new Error('An account with this email already exists. Sign in instead, or use “Forgot password?” to reset it.');
        if (!data.session) setMsg(`Almost there. We sent a confirmation link to ${email}. Open it to activate your account.`); else location.href = '/app'; }
      else { const { error } = await sb.auth.signInWithPassword({ email, password: pw });
        if (error) throw new Error(/confirm/i.test(error.message) ? 'Please confirm your email first. Check your inbox for the link.' : /invalid/i.test(error.message) ? 'That email and password don’t match. Try again or reset your password.' : error.message);
        location.href = '/app'; }
    } catch (err) { setError(err); } finally { setBusy(false); }
  }
  return <div className="auth"><div className="auth-art"><Link href="/" className="wordmark lg">Ikar<em>vo</em></Link><div><p className="display">Build it, ship it, sell it. From one brief.</p><ul><li><b>01</b>Prompt to a working app, live in minutes</li><li><b>02</b>Push to GitHub, deploy to Vercel</li><li><b>03</b>UGC and motion ads, Meta campaigns</li><li><b>04</b>An AI CMO that writes the launch</li></ul></div><span className="small" style={{ color: '#9f988a', position: 'relative', zIndex: 1 }}>© Ikarvo</span></div>
    <form className="auth-card" onSubmit={submit}><h1>{mode === 'up' ? 'Create your account' : mode === 'reset' ? 'Reset your password' : mode === 'magic' ? 'Sign in with a link' : 'Welcome back'}</h1><p className="auth-sub">{mode === 'up' ? 'Free to start. No card needed.' : mode === 'reset' ? 'Enter your email and we’ll send you a link to set a new password.' : mode === 'magic' ? 'Enter your email and we’ll send you a one-time sign-in link.' : 'Sign in to your workspace.'}</p>
      <label className="label">Email<input className="input" type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} /></label>
      {(mode === 'in' || mode === 'up') && <label className="label">Password<input className="input" type="password" required minLength={8} placeholder={mode === 'up' ? 'At least 8 characters' : undefined} autoComplete={mode === 'up' ? 'new-password' : 'current-password'} value={pw} onChange={e => setPw(e.target.value)} /></label>}
      {mode === 'in' && <div className="auth-forgot"><button type="button" className="link" onClick={() => { setMode('reset'); setMsg(''); setError(null); }}>Forgot password?</button></div>}
      <button className="btn primary wide" disabled={busy}>{busy ? <><span className="spin" aria-hidden />One moment…</> : mode === 'up' ? 'Create account' : mode === 'reset' ? 'Send reset link' : mode === 'magic' ? 'Email me a sign-in link' : 'Sign in'}</button>
      {mode === 'in' && <><div className="auth-or" aria-hidden><span>or</span></div><button type="button" className="btn wide" onClick={() => { setMode('magic'); setMsg(''); setError(null); }}>Email me a sign-in link</button></>}
      {msg && <p className="auth-ok" role="status">{msg}</p>}<ErrorNote error={error} />
      <div className="row between small"><button type="button" className="link" onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setMsg(''); setError(null); }}>{mode === 'in' ? 'New here? Create an account' : 'Have an account? Sign in'}</button></div>
      <p className="small muted" style={{ marginTop: 12, lineHeight: 1.5 }}>By continuing you agree to Ikarvo&rsquo;s <Link href="/legal/terms">Terms of Use</Link> and <Link href="/legal/privacy">Privacy Policy</Link>.</p>
    </form></div>;
}

function NewPassword({ onDone }: { onDone: () => void }) {
  const [pw, setPw] = useState(''); const [pw2, setPw2] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState<unknown>(null);
  async function submit(e: FormEvent) {
    e.preventDefault(); setError(null);
    if (pw !== pw2) { setError(new Error('Passwords don’t match.')); return; }
    setBusy(true);
    try { const { error } = await createClient().auth.updateUser({ password: pw }); if (error) throw error; history.replaceState(null, '', '/app'); onDone(); }
    catch (err) { setError(err); } finally { setBusy(false); }
  }
  return <div className="fullcenter"><form className="auth-card" onSubmit={submit}><h1>Choose a new password</h1><p className="auth-sub">You’re signed in. Set a new password to finish resetting it.</p>
    <label className="label">New password<input className="input" type="password" required minLength={8} autoComplete="new-password" value={pw} onChange={e => setPw(e.target.value)} /></label>
    <label className="label">Confirm new password<input className="input" type="password" required minLength={8} autoComplete="new-password" value={pw2} onChange={e => setPw2(e.target.value)} /></label>
    <button className="btn primary wide" disabled={busy}>{busy ? <><span className="spin" aria-hidden />Saving…</> : 'Save password'}</button><ErrorNote error={error} /></form></div>;
}

export default function Workspace() {
  const [reset, setReset] = useState(false);
  useEffect(() => { if (new URLSearchParams(location.search).get('reset') === '1') setReset(true); }, []);
  const [shared, setShared] = useState<Shared[] | null>(null); const [active, setActive] = useState<string | null>(null);
  const [status, setStatus] = useState<Status | null>(null); const [email, setEmail] = useState<string | null>(null); const [err, setErr] = useState<unknown>(null);
  useEffect(() => {
    api<Status>('/api/status').then(async s => {
      setStatus(s);
      if (s.preview) { setShared([]); setEmail('preview@local'); return; }
      if (!s.supabase.ok) return;
      const sb = createClient(); const { data } = await sb.auth.getUser();
      if (data.user) { const t = await api<{ workspaces: Shared[] }>('/api/team').catch(() => ({ workspaces: [] as Shared[] })); const want = localStorage.getItem(WS_KEY);
        const ok = t.workspaces.find(w => w.owner === want) ? want : null; if (!ok) localStorage.removeItem(WS_KEY); setActiveWorkspace(ok); setActive(ok); setShared(t.workspaces); } else setShared([]);
      setEmail(data.user?.email ?? '');
      sb.auth.onAuthStateChange((_e: string, sess: { user?: { email?: string } } | null) => setEmail(sess?.user?.email ?? ''));
    }).catch(setErr);
  }, []);
  if (err) return <div className="fullcenter"><ErrorNote error={err} /></div>;
  if (!status || ((email === null || shared === null) && (status.preview || status.supabase.ok))) return <Boot />;
  if (!status.preview && !status.supabase.ok) return <div className="fullcenter"><div className="auth-card"><h1>We&rsquo;ll be right back</h1><p className="muted">Sign-in is temporarily unavailable. Please try again in a few minutes.</p><Link href="/" className="btn ghost">Back to home</Link></div></div>;
  if (!status.preview && !email) return <AuthForm />;
  if (reset && !status.preview) return <NewPassword onDone={() => setReset(false)} />;
  return <Suspense><Shell status={status} email={email || ''} mode={status.preview ? 'local' : 'cloud'} shared={shared ?? []} active={active} /></Suspense>;
}
