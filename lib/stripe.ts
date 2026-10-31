import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { envValue } from '@/lib/env';

/** Minimal Stripe REST client (form-encoded), avoids pulling the full SDK. */
export async function stripe(path: string, params: Record<string, string>) {
  const r = await fetch(`https://api.stripe.com/v1/${path}`, { method: 'POST', body: new URLSearchParams(params),
    headers: { Authorization: `Bearer ${envValue('STRIPE_SECRET_KEY')}`, 'Content-Type': 'application/x-www-form-urlencoded' } });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Stripe error: ${d?.error?.message ?? r.status}`);
  return d;
}

export function verifyStripeSignature(payload: string, header: string | null, secret: string, toleranceSec = 300) {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(',').map(p => p.split('=') as [string, string]));
  const t = Number(parts.t); const sigs = header.split(',').filter(p => p.startsWith('v1=')).map(p => p.slice(3));
  if (!t || !sigs.length || Math.abs(Date.now() / 1000 - t) > toleranceSec) return false;
  const expected = createHmac('sha256', secret).update(`${t}.${payload}`).digest('hex');
  return sigs.some(s => s.length === expected.length && timingSafeEqual(Buffer.from(s), Buffer.from(expected)));
}
