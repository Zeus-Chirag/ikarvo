import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms · Ikarvo',
  description: 'The terms that apply when you use Ikarvo to build, ship and market software.',
};

export default function TermsPage() {
  return (
    <main className="page">
      <header className="page-head">
        <div>
          <span className="kicker">Legal</span>
          <h1>Terms</h1>
          <p className="small muted">Last updated 31 October 2026</p>
        </div>
      </header>

      <section className="panel">
        <p>
          These terms are the agreement between you and Ikarvo. By creating an account or using the workspace, you
          accept them. If you do not, do not use the service.
        </p>

        <h2 className="h2">What Ikarvo does</h2>
        <p>
          Ikarvo generates web applications from prompts, previews them, and can ship them to your own GitHub and
          Vercel accounts. It can also research a market, draft posts, articles and emails, generate ad creative, and
          publish or schedule that content to accounts you connect. It is a tool: it does not guarantee that anything
          you build will work, sell, rank, or be approved by a platform.
        </p>

        <h2 className="h2">Your account</h2>
        <p>
          You need to be at least 18 and you are responsible for what happens under your account, including anything
          done with the integrations you connect. Keep your sign-in method secure, and tell us if you think someone
          else has access.
        </p>

        <h2 className="h2">Plans and credits</h2>
        <p>
          Ikarvo has a free tier and a paid plan. Paid subscriptions are handled by Stripe; you can change or cancel
          from the billing portal at any time, and cancellation stops future renewals rather than refunding past ones.
          Generation and media work consumes credits, and the balance shown in the workspace is the balance that
          applies.
        </p>
        <p>
          Prices, plan limits and credit allowances can change. The price shown at checkout is the one that applies to
          that purchase. If a paid feature cannot run because a required key is missing, nothing is charged for it.
        </p>

        <h2 className="h2">Your content</h2>
        <p>
          You own the prompts, documents, code and media you create, and the projects you ship to your own accounts.
          You give us the limited permission needed to store, process and transmit that content so the product can
          work, for example sending a prompt to a model provider or a post to the platform you approved.
        </p>

        <h2 className="h2">Third-party platforms</h2>
        <p>
          Publishing and shipping happen through other companies: GitHub, Vercel, X, LinkedIn, WordPress, Meta,
          Google, Supabase and the model providers. You are responsible for complying with their terms and for having
          the right to post what you post. Advertising campaigns are created paused, and you are the one who approves
          spend. If a platform changes or revokes its API, that feature may stop working.
        </p>

        <h2 className="h2">AI output</h2>
        <p>
          Generated text, code, images and video can be wrong, incomplete, or similar to other output. Review it before
          you publish it or ship it to customers. You are responsible for what you put your name on.
        </p>

        <h2 className="h2">Acceptable use</h2>
        <p>Do not use Ikarvo to:</p>
        <ul>
          <li>break the law, infringe someone&apos;s rights, or violate a connected platform&apos;s rules;</li>
          <li>send spam, run deceptive campaigns, or impersonate people or brands;</li>
          <li>publish malware, phishing pages, or content designed to harm;</li>
          <li>attack the service, probe it for other users&apos; data, or resell it as your own without permission.</li>
        </ul>
        <p>We can suspend an account that does any of this.</p>

        <h2 className="h2">Availability and changes</h2>
        <p>
          The service is provided as it is, and features can change, break or be withdrawn. Some capabilities depend
          on keys and third-party APIs that we do not control, and the status panel in the workspace tells you what is
          currently configured.
        </p>

        <h2 className="h2">No warranty, limited liability</h2>
        <p>
          To the extent the law allows, Ikarvo is provided without warranties of any kind, and we are not liable for
          indirect or consequential loss, lost profits, lost data, or the results of anything you published or
          deployed. Where liability cannot be excluded, it is limited to the amount you paid us in the three months
          before the claim.
        </p>

        <h2 className="h2">Ending the agreement</h2>
        <p>
          You can stop using Ikarvo and delete your account whenever you like, which also revokes the tokens we hold.
          We can suspend or end access if these terms are broken or if we have to for legal reasons.
        </p>

        <h2 className="h2">Governing law</h2>
        <p>
          These terms are governed by the law that applies at the operator&apos;s principal place of business, and
          disputes go to the courts there, unless local consumer law gives you a different forum.
        </p>

        <h2 className="h2">Contact</h2>
        <p>
          <strong>support@ikarvo.app</strong>. See also the <a href="/privacy">privacy policy</a> and the{' '}
          <a href="/help">help page</a>.
        </p>
      </section>
    </main>
  );
}
