import { NextResponse } from 'next/server';
import { requireActor } from '@/lib/auth';
import { appUrl, featureStatus } from '@/lib/env';
import { fail } from '@/lib/http';
import { stripe } from '@/lib/stripe';
export const runtime = 'nodejs';
export async function POST(req: Request) {
  const f = featureStatus().stripe; if (!f.ok) return fail(503, `Billing is not configured. Add ${f.missing.join(', ')}.`, f.missing);
  const actor = await requireActor(); if (actor instanceof NextResponse) return actor;
  if (!actor.supabase) return fail(400, 'The billing portal needs a signed-in Supabase account.');
  const { data } = await actor.supabase.from('profiles').select('stripe_customer_id').eq('id', actor.id).maybeSingle();
  if (!data?.stripe_customer_id) return fail(404, 'No Stripe customer is linked to this account yet. Upgrade first.');
  try {
    const s = await stripe('billing_portal/sessions', { customer: data.stripe_customer_id, return_url: `${appUrl(new URL(req.url).origin)}/app?view=billing` });
    return NextResponse.json({ url: s.url });
  } catch (e) { return fail(502, e instanceof Error ? e.message : 'Stripe request failed.'); }
}
