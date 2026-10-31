import { envValue as v } from '@/lib/env';
/**
 * Ikarvo's own plan model: one free tier and one paid tier, both measured in monthly credits.
 * Every number and label below is a placeholder you set in env. Nothing here mirrors any other product's pricing.
 */
export type Plan = { id: 'free' | 'pro'; name: string; price: string; credits: number; blurb: string; perks: string[] };
export function plans(): { plans: Plan[]; configurable: string[] } {
  const free = Number(v('CREDITS_FREE_MONTHLY') || 150), pro = Number(v('CREDITS_PRO_MONTHLY') || 1000);
  return {
    configurable: ['PLAN_FREE_NAME', 'PLAN_PRO_NAME', 'PLAN_PRO_PRICE_LABEL', 'CREDITS_FREE_MONTHLY', 'CREDITS_PRO_MONTHLY', 'STRIPE_PRICE_ID'],
    plans: [
      { id: 'free', name: v('PLAN_FREE_NAME') || 'Starter', price: 'Free', credits: free, blurb: 'Every agent and tool, metered by credits.', perks: [`${free} credits every month`, 'All agents, Ad Studio and exports', 'Bring your own provider keys'] },
      { id: 'pro', name: v('PLAN_PRO_NAME') || 'Growth', price: v('PLAN_PRO_PRICE_LABEL') || 'Paid monthly', credits: pro, blurb: 'Same features, a bigger monthly credit pool.', perks: [`${pro} credits every month`, 'Background publishing & digests', 'Stripe invoices and billing portal'] },
    ],
  };
}
