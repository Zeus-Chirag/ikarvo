import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Ikarvo",
  description: "AI-powered growth and publishing for modern teams.",
}

export default function Page() {
  return (
    <main className="root">
      <header className="topbar">
        <div className="wordmark">Ikarvo</div>
        <nav>
          <a href="/app" className="ghost">App</a>
          <a href="/privacy" className="ghost">Privacy</a>
          <a href="/terms" className="ghost">Terms</a>
          <a href="/cookies" className="ghost">Cookies</a>
        </nav>
      </header>
      <section className="hero legal-section">
        <h1>Ship faster with your own integrations.</h1>
        <p>
          Ikarvo connects to the tools you already use — GitHub, Vercel,
          Google, Meta Ads, and more — so your team can move without copying
          things between tabs.
        </p>
      </section>
    </main>
  )
}
