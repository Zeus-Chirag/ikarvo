import Link from 'next/link';
export default function NotFound() {
  return <div className="fullcenter"><div className="auth-card nf">
    <span className="kicker">404</span><h1 className="display">Nothing lives here.</h1>
    <p className="muted">The link may be old, or the page moved when KynthAI became Ikarvo.</p>
    <div className="row"><Link href="/app" className="btn primary">Open workspace</Link><Link href="/" className="btn ghost">Home</Link></div>
  </div></div>;
}
