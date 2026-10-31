import 'server-only';
import { envValue } from '@/lib/env';
import type { Actor } from '@/lib/auth';

/** Credit price list (our own numbers). Keys are agent actions; unknown actions cost CREDIT_DEFAULT. */
export const CREDIT_COSTS: Record<string, { cost: number; label: string }> = {
  generate: { cost: 12, label: 'Build Studio app / edit' }, creative: { cost: 6, label: 'Ad / UGC concept' }, ugc: { cost: 6, label: 'UGC script batch' },
  media: { cost: 40, label: 'AI image or video render' }, marketing: { cost: 4, label: 'Posts / campaign / listing' }, brief: { cost: 10, label: 'Strategy documents' },
  docs: { cost: 8, label: 'Extra context document' }, competitors: { cost: 3, label: 'Find competitors' }, article: { cost: 15, label: 'SEO article' },
  reply: { cost: 3, label: 'Community reply draft' }, outreach: { cost: 2, label: 'Outreach draft' }, visibility: { cost: 8, label: 'AI-visibility run' },
  voice: { cost: 1, label: 'Voice score' }, headlines: { cost: 2, label: 'A/B variants' }, report: { cost: 3, label: 'Weekly report' },
  hn: { cost: 4, label: 'Show HN drafts' }, chat: { cost: 1, label: 'AI CMO chat message' },
  tts: { cost: 3, label: 'Voiceover (TTS)' }, captions: { cost: 2, label: 'Auto-captions (Whisper)' }, music: { cost: 6, label: 'AI music bed' }, avatar: { cost: 45, label: 'AI avatar / actor video' }, adcopy: { cost: 3, label: 'Ad copy variants' }, sequence: { cost: 6, label: 'Email / lifecycle sequence' }, launch: { cost: 8, label: 'Launch plan' },
};
const DEFAULT = 2;
export const costOf = (action: string) => CREDIT_COSTS[action]?.cost ?? DEFAULT;
export function allowanceFor(plan: string) { return Number(envValue(plan === 'pro' ? 'CREDITS_PRO_MONTHLY' : 'CREDITS_FREE_MONTHLY') || (plan === 'pro' ? 1000 : 150)); }
export const monthStart = () => { const d = new Date(); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)); };
export const nextReset = () => { const d = monthStart(); d.setUTCMonth(d.getUTCMonth() + 1); return d; };

type Ev = { action: string; cost: number; at: string };
const g = globalThis as unknown as { __kxCredits?: Ev[] };
/** Preview mode keeps a ledger in server memory (lost on restart). It is labelled as such in the UI. */
const mem = () => (g.__kxCredits ??= []);

async function plan(actor: Actor) { if (!actor.supabase) return envValue('PREVIEW_PLAN') || 'free'; const { data } = await actor.supabase.from('profiles').select('plan').eq('id', actor.id).maybeSingle(); return (data?.plan as string) || 'free'; }

/** Atomically spend credits. Returns null when allowed, or an error message. */
export async function spend(actor: Actor, action: string): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  const cost = costOf(action); const p = await plan(actor); const allowance = allowanceFor(p);
  if (!actor.supabase) {
    const since = monthStart().toISOString(); const used = mem().filter(e => e.at >= since).reduce((a, e) => a + e.cost, 0);
    if (used + cost > allowance) return { ok: false, status: 402, message: `Not enough credits: ${allowance - used} left, this needs ${cost}. Credits reset ${nextReset().toDateString()}.` };
    mem().unshift({ action, cost, at: new Date().toISOString() }); return { ok: true };
  }
  const { data, error } = await actor.supabase.rpc('spend_credits', { p_action: action, p_cost: cost, p_allowance: allowance });
  if (error) return { ok: false, status: 503, message: `Credit check failed: ${error.message}. Run the Supabase migrations (credits).` };
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.allowed) return { ok: false, status: 402, message: `Not enough credits: ${Math.max(0, allowance - (row?.used ?? allowance))} left, this needs ${cost}. Credits reset ${nextReset().toDateString()}.` };
  return { ok: true };
}
/** Give credits back when the provider call failed, so users never pay for errors. */
export async function refund(actor: Actor, action: string) {
  const cost = costOf(action);
  if (!actor.supabase) { mem().unshift({ action: `refund:${action}`, cost: -cost, at: new Date().toISOString() }); return; }
  await actor.supabase.rpc('refund_credits', { p_action: action, p_cost: cost });
}
export async function usage(actor: Actor) {
  const p = await plan(actor); const allowance = allowanceFor(p); const since = monthStart().toISOString();
  let events: Ev[];
  if (!actor.supabase) events = mem().filter(e => e.at >= since);
  else { const { data, error } = await actor.supabase.from('credit_events').select('action,cost,created_at').gte('created_at', since).order('created_at', { ascending: false }).limit(500);
    if (error) throw new Error(`${error.message}. Run the credits migration.`); events = (data ?? []).map(r => ({ action: r.action as string, cost: r.cost as number, at: r.created_at as string })); }
  const used = events.reduce((a, e) => a + e.cost, 0);
  return { plan: p, allowance, used, remaining: Math.max(0, allowance - used), resetsAt: nextReset().toISOString(), events: events.slice(0, 50), costs: CREDIT_COSTS, ledger: actor.supabase ? 'supabase' : 'memory' };
}
