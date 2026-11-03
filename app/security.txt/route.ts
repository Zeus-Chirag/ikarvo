import { NextResponse } from 'next/server';

/**
 * Vulnerability disclosure policy, served at /security.txt (industry standard;
 * also honored by Google and other tooling that scans for security contact info).
 * Contact comes from CONTACT_EMAIL; until it is set, the contact page URL is listed.
 */
export function GET() {
  const email = (process.env.CONTACT_EMAIL ?? '').trim();
  const base = (process.env.APP_URL ?? 'https://ikarvo.vercel.app').trim().replace(/\/+$/, '');
  const contact = email ? `mailto:${email}` : `${base}/legal/contact`;
  const body = `Contact: ${contact}
Expires: 2027-11-03T00:00:00.000Z
Preferred-Languages: en
Canonical: ${base}/.well-known/security.txt

# Ikarvo Security

Ikarvo takes the security of this product and its users' data seriously.
We encourage responsible disclosure of security vulnerabilities.

Contact: ${contact} (security, privacy and legal)

Scope:
  - All public routes of this site, including /api endpoints.
  - Authentication: Supabase-based sessions, encrypted integration tokens
    (AES-256-GCM, httpOnly), and the per-IP rate limiter.

Out of scope:
  - Third-party services (Supabase, GitHub, Vercel, Stripe, Meta, etc.)
    — report those to the vendor.

Guidelines:
  - Do not access data that belongs to other users.
  - Do not perform denial-of-service testing.
  - Include reproducible steps, affected endpoints, and discovery date.

Response:
  - Acknowledgment within 3 business days.
  - If confirmed, a fix before public disclosure; no public bounty payout is offered.
`;
  return new NextResponse(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
