import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Help · Ikarvo',
  description: 'How to run Ikarvo without keys, what the status panel means, how credits work, and why a post did not publish.',
};

const FAQ: { q: string; a: React.ReactNode }[] = [
  {
    q: 'Can I use it without any API keys?',
    a: (
      <>
        Yes. With <code>PREVIEW_MODE=1</code> in <code>.env.local</code> the workspace skips sign-in and keeps your
        documents in the browser, so you can click through the whole product before configuring anything.
      </>
    ),
  },
  {
    q: 'What does “needs keys” next to a feature mean?',
    a: (
      <>
        The status panel is built from the environment: for each capability it reports whether its keys are present and,
        if not, which key names are missing. It lists names only, never values. Set those variables and the feature
        turns on without a redeploy of any code.
      </>
    ),
  },
  {
    q: 'How do credits work?',
    a: (
      <>
        Generation and media work spends credits, and your balance is shown in the workspace. A failed call does not
        leave you charged for a result you never got.
      </>
    ),
  },
  {
    q: 'How do I connect GitHub and Vercel?',
    a: (
      <>
        Connect them from the integrations panel. GitHub is used to create a repository and push your project; Vercel
        deploys it. Both act with your own account, and you can disconnect at any time, which removes the stored token.
      </>
    ),
  },
  {
    q: 'Will it post anything without me?',
    a: (
      <>
        No. Posts stay in your calendar until you approve them. Approved posts are published at their scheduled time by
        the background scheduler, or immediately when you press Publish now.
      </>
    ),
  },
  {
    q: 'My approved post did not publish. Why?',
    a: (
      <>
        The scheduler needs <code>CRON_SECRET</code>, <code>SCHEDULER_OWNER_USER_ID</code> and a Supabase service role
        key, and the calendar entry needs to be approved by a signed-in account. If any of that is missing, the post
        waits and the workspace tells you which piece is absent. Publish now works without the scheduler.
      </>
    ),
  },
  {
    q: 'Do ad campaigns spend money on their own?',
    a: (
      <>
        No. Campaigns built from your ad renders are created paused on Meta, and they only start spending once you
        enable them in Ads Manager.
      </>
    ),
  },
  {
    q: 'How do I delete my account and my data?',
    a: (
      <>
        Delete the account from inside the workspace. That removes your documents and revokes the tokens we hold for
        connected apps. If you would rather we did it, email <strong>support@ikarvo.app</strong>.
      </>
    ),
  },
];

export default function HelpPage() {
  return (
    <main className="page">
      <header className="page-head">
        <div>
          <span className="kicker">Help</span>
          <h1>Questions, answered</h1>
          <p>
            The short version of how Ikarvo behaves: what runs without keys, what the status panel is telling you,
            and what happens before anything becomes public.
          </p>
        </div>
      </header>

      <section className="panel">
        {FAQ.map((item) => (
          <details key={item.q}>
            <summary>
              <strong>{item.q}</strong>
            </summary>
            <p className="small muted">{item.a}</p>
          </details>
        ))}
      </section>

      <section className="panel">
        <h2 className="h2">Still stuck?</h2>
        <p>
          Email <strong>support@ikarvo.app</strong> with what you pressed and what you expected. The{' '}
          <a href="/privacy">privacy policy</a> explains what we can see, and the <a href="/terms">terms</a> cover
          what the service promises.
        </p>
      </section>
    </main>
  );
}
