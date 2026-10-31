/** Power tiers for the builder. Shared by the client (picker, progress) and the server (model, budget, steps). */
export type Tier = 'fast' | 'pro' | 'max';
export const TIERS: Tier[] = ['fast', 'pro', 'max'];
export const TIER_INFO: Record<Tier, { label: string; icon: string; badge: string; desc: string; steps: string[]; stepMs: number }> = {
  fast: { label: 'Fast', icon: 'bolt', badge: '1 pass', desc: 'Quick single pass on a fast model. Best for drafts.', steps: ['Reading your brief', 'Writing the project', 'Checking the result'], stepMs: 8000 },
  pro: { label: 'Pro', icon: 'spark', badge: 'Plan + build', desc: 'Plans files and screens first, then builds on a strong model.', steps: ['Planning screens and files', 'Building the project', 'Checking the result'], stepMs: 15000 },
  max: { label: 'Max', icon: 'layers', badge: '+ self-review', desc: 'Plans, builds on the top model, then reviews and fixes its own code.', steps: ['Planning screens and files', 'Building the project', 'Self-review and fixes', 'Checking the result'], stepMs: 22000 },
};
export const isTier = (x: unknown): x is Tier => TIERS.includes(x as Tier);
