import { NextResponse } from 'next/server';

export function GET() {
  const body = `# Ikarvo

Ikarvo is a product-to-market workspace. Describe a product; Ikarvo builds a working app,
deploys it to GitHub and Vercel, produces UGC and motion ads, and plans marketing.

## Main routes

- /: Product landing page.
- /app: The workspace (AI CMO dashboard, Build Studio, Projects, Ad Studio, Marketing, Integrations, Billing, Settings).
- /legal/privacy: Privacy policy.
- /legal/terms: Terms of use.

## What makes this site different

- Generated output is a draft; a human approves every publish.
- No analytics, trackers, or third-party data exfiltration in generated apps.
- Site audits check titles, meta descriptions, H1s, canonical links, JSON-LD, and alt text.
`;
  return new NextResponse(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
