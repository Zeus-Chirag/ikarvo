import { aiJsonRoute, NO_HYPE, briefText } from '@/lib/growth';
import { str } from '@/lib/http';
export const runtime = 'nodejs';
/** UGC agent: a batch of short-form, creator-style video drafts. Rendering uses /api/media (Replicate/fal). */
export const POST = aiJsonRoute(b => ({ maxTokens: 4000,
  system: `You write UGC-style short-form video drafts (TikTok/Reels/Shorts) that feel filmed by a real customer on a phone. ${NO_HYPE} No fake reviews: the persona is a described archetype, and anything claimed must be in the brief. Return strict JSON {"drafts":[{"title":string,"persona":string,"setting":string,"hook":string,"script":[{"t":string,"line":string,"shot":string}],"caption":string,"hashtags":[string],"videoPrompt":string}]} with ${Math.min(6, Math.max(1, Number(b.count) || 3))} drafts, each 15-30 seconds.`,
  user: `Brief:\n${briefText(b.brief)}\nPlatform: ${str(b.platform, 40) || 'TikTok'}\nInstructions: ${str(b.instructions, 2000)}\nLanguage: ${str(b.language, 40) || 'English'}` }));
