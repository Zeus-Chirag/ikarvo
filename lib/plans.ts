import { envValue as v } from '@/lib/env';
/** Ikarvo's public pricing. Credits meter every agent; video renders draw from the included video allowance. */
export type PlanId = 'free' | 'starter' | 'pro' | 'agency';
export type Plan = { id: PlanId; name: string; price: string; monthly: number; annual: number; credits: number; videos: number; popular?: boolean; blurb: string; perks: string[] };
export const VIDEO_CREDITS = 220; // one 15s standard render, priced above provider cost
export const AVATAR_CREDITS = 450; // one 15s premium/avatar render
export const TIERS: Omit<Plan, 'price'>[] = [
  { id: 'free', name: 'Free', monthly: 0, annual: 0, credits: 150, videos: 0, blurb: 'Try every text agent on your own product.', perks: ['150 credits every month', 'AI CMO chat, research & content agents', 'Competitor, Reddit & HN discovery', 'No video rendering'] },
  { id: 'starter', name: 'Starter', monthly: 29, annual: 23, credits: 800, videos: 0, blurb: 'For founders running growth on the side.', perks: ['800 credits every month', 'Everything in Free', 'SEO articles, backlinks & AI visibility', 'Scheduled publishing', 'Video via add-on packs'] },
  { id: 'pro', name: 'Pro', monthly: 79, annual: 63, credits: 2000, videos: 2, popular: true, blurb: 'For teams shipping content every week.', perks: ['2,000 credits every month', '2 × 15s UGC videos included', 'Everything in Starter', 'AI voiceover & music', 'Priority generation'] },
  { id: 'agency', name: 'Agency', monthly: 249, annual: 199, credits: 7000, videos: 8, blurb: 'For agencies running many brands.', perks: ['7,000 credits every month', '8 × 15s UGC videos included', 'Everything in Pro', 'Multiple workspaces & team seats', 'Premium avatar videos'] },
];
export const ADDONS = [
  { id: 'videos5', name: '5 standard videos', detail: '15s UGC videos with voiceover, b-roll and captions', price: 25 },
  { id: 'avatar5', name: '5 premium avatar videos', detail: '15s lip-synced AI presenter videos', price: 59 },
  { id: 'credits500', name: '500 extra credits', detail: 'Top up any plan; never expire while subscribed', price: 15 },
];
export const isPlanId = (x: unknown): x is PlanId => TIERS.some(t => t.id === x);
export const tierOf = (id: string) => TIERS.find(t => t.id === id) ?? TIERS[0];
export const checkoutReady = () => !!(v('STRIPE_SECRET_KEY') && v('STRIPE_PRICE_ID'));
export function plans(): { plans: Plan[]; addons: typeof ADDONS; checkout: boolean; configurable: string[] } {
  return { checkout: checkoutReady(), addons: ADDONS, configurable: ['STRIPE_SECRET_KEY', 'STRIPE_PRICE_ID'],
    plans: TIERS.map(t => ({ ...t, price: t.monthly ? `$${t.monthly}/mo` : 'Free' })) };
}
