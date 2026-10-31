import { NextResponse } from 'next/server';
import { envValue } from '@/lib/env';
import { fail } from '@/lib/http';
import { verifyStripeSignature } from '@/lib/stripe';
import { adminClient } from '@/lib/supabase/admin';
export const runtime = 'nodejs';
export async function POST(req: Request) {
  const secret = envValue('STRIPE_WEBHOOK_SECRET'); if (!secret) return fail(503, 'STRIPE_WEBHOOK_SECRET is not set.');
  const payload = await req.text();
  if (!verifyStripeSignature(payload, req.headers.get('stripe-signature'), secret)) return fail(400, 'Invalid signature.');
  const event = JSON.parse(payload);
  const db = adminClient(); if (!db) return fail(503, 'SUPABASE_SERVICE_ROLE_KEY is required to record billing changes.');
  const o = event.data?.object ?? {};
  if (event.type === 'checkout.session.completed' && o.client_reference_id) {
    const { error } = await db.from('profiles').update({ plan: 'pro', stripe_customer_id: o.customer }).eq('id', o.client_reference_id);
    if (error) return fail(500, error.message);
  } else if (event.type === 'customer.subscription.deleted' || (event.type === 'customer.subscription.updated' && !['active', 'trialing'].includes(o.status))) {
    await db.from('profiles').update({ plan: 'free' }).eq('stripe_customer_id', o.customer);
  } else if (event.type === 'customer.subscription.updated') {
    await db.from('profiles').update({ plan: 'pro' }).eq('stripe_customer_id', o.customer);
  }
  return NextResponse.json({ received: true });
}
