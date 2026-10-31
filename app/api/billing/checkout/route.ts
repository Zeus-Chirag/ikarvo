import { NextResponse } from 'next/server';
import { requireActor } from '@/lib/auth';
import { appUrl, featureStatus, envValue } from '@/lib/env';
import { fail } from '@/lib/http';
import { stripe } from '@/lib/stripe';
export const runtime = 'nodejs';
export async function POST(req: Request) {
  const f = featureStatus().stripe; if (!f.ok) return fail(503, `Billing is not configured. Add ${f.missing.join(', ')}.`, f.missing);
  const actor = await requireActor(); if (actor instanceof NextResponse) return actor;
  const base = appUrl(new URL(req.url).origin);
  try {
    const s = await stripe('checkout/sessions', { mode: 'subscription', 'line_items[0][price]': envValue('STRIPE_PRICE_ID'), 'line_items[0][quantity]': '1',
      success_url: `${base}/app?view=billing&checkout=success`, cancel_url: `${base}/app?view=billing&checkout=cancel`,
      client_reference_id: actor.id, allow_promotion_codes: 'true', ...(actor.email && !actor.preview ? { customer_email: actor.email } : {}) });
    return NextResponse.json({ url: s.url });
  } catch (e) { return fail(502, e instanceof Error ? e.message : 'Stripe request failed.'); }
}
