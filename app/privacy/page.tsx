import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy · Ikarvo',
  description: 'What Ikarvo stores, why it stores it, who processes it, and how to have all of it deleted.',
};

export default function PrivacyPage() {
  return (
    <main className="page">
      <header className="page-head">
        <div>
          <span className="kicker">Legal</span>
          <h1>Privacy</h1>
          <p className="small muted">Last updated 31 October 2026</p>
        </div>
      </header>

      <section className="panel">
        <p>
          Ikarvo turns a prompt into a working web app, then helps you ship and market it. Doing that means it
          touches two kinds of data: the account you sign in with, and the work you create inside the workspace.
          This page lists both, in plain language.
        </p>

        <h2 className="h2">What we store</h2>
        <ul>
          <li>
            <strong>Your account.</strong> Email address, display name and avatar as returned by the identity
            provider you sign in with, plus a signed session cookie. Accounts and records live in Supabase.
          </li>
          <li>
            <strong>Connected accounts.</strong> If you connect GitHub, Vercel, Google, Meta, X or LinkedIn we store
            the OAuth tokens needed to act on your behalf. Tokens are encrypted at rest with SESSION_SECRET and are
            only used when you press a button that needs them. Secrets are never returned to the browser.
          </li>
          <li>
            <strong>Your work.</strong> Prompts, generated projects and files, brand and strategy documents, content
            calendar posts, articles, ad renders, and any media you upload or generate, along with your credit balance.
          </li>
          <li>
            <strong>Billing.</strong> Your Stripe customer id, plan and invoice status. Card details go straight to
            Stripe and never reach Ikarvo.
          </li>
          <li>
            <strong>Operational data.</strong> Error logs and the names of missing configuration keys, so the status
            panel can tell you what to set. Those panels show key names, never key values.
          </li>
        </ul>

        <h2 className="h2">Who processes it</h2>
        <p>
          We use a small set of processors to run the product: Supabase (authentication and database), Vercel
          (hosting and scheduled jobs), Stripe (payments), an OpenAI-compatible model provider such as OpenRouter
          (text generation), Perplexity or OpenRouter online models (search-grounded answers), Replicate or fal
          (image and video generation), GitHub and Vercel APIs (shipping your projects), Google (Search Console and
          Analytics), Meta (advertising), and X, LinkedIn and WordPress (publishing). Each of them handles your data
          under its own terms.
        </p>
        <p>
          When you run a generator, the prompt and the workspace context you selected are sent to the model
          provider configured for that workspace. Their retention rules apply to those requests. We do not sell
          personal data, and we do not use your workspace content to train models ourselves.
        </p>

        <h2 className="h2">Publishing is your call</h2>
        <p>
          Nothing is posted to a social account or published to a site unless you approve it. When it is approved,
          the content becomes public on that platform and is governed by that platform&apos;s rules. Campaigns
          created through the Meta Ads integration are created paused, so no money is spent until you switch them on.
        </p>

        <h2 className="h2">How long we keep it</h2>
        <p>
          Workspace content stays for as long as your account exists. Deleting your account removes your profile,
          your documents and your stored integration tokens; encrypted backups roll off on their normal cycle.
          Billing records are kept where tax and accounting law requires it.
        </p>

        <h2 className="h2">Deleting everything</h2>
        <p>
          You can delete your account from inside the workspace, which calls the account deletion route and removes
          your data. You can also email us and we will do it for you. Deleting your account also revokes the tokens
          we hold, so connected apps lose access.
        </p>

        <h2 className="h2">Your rights</h2>
        <p>
          Depending on where you live, for example under the GDPR in the EU and UK or India&apos;s DPDP Act, you may
          have the right to access, correct, export, or delete your personal data, and to object to certain
          processing. Write to us and we will respond within the period the law allows.
        </p>

        <h2 className="h2">Security</h2>
        <p>
          Traffic is encrypted in transit, integration tokens are encrypted at rest, and secrets are read on the
          server only. No system is perfect: if you find a problem, tell us rather than testing it on other people&apos;s
          accounts.
        </p>

        <h2 className="h2">Children</h2>
        <p>Ikarvo is not intended for anyone under 18, and we do not knowingly collect data from children.</p>

        <h2 className="h2">Changes</h2>
        <p>
          If this policy changes in a way that matters, we will update the date at the top and, for significant
          changes, tell you inside the workspace.
        </p>

        <h2 className="h2">Contact</h2>
        <p>
          Questions, deletion requests, or a data export: <strong>support@ikarvo.app</strong>. See also the{' '}
          <a href="/terms">terms</a> and the <a href="/help">help page</a>.
        </p>
      </section>
    </main>
  );
}
