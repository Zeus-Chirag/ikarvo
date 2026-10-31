import { aiJsonRoute, NO_HYPE, briefText } from '@/lib/growth';
import { str } from '@/lib/http';
export const runtime = 'nodejs';
export const POST = aiJsonRoute(b => {
  const base = str(b.headline, 300); if (base.length < 4) return 'Enter the headline or offer to test.';
  return { maxTokens: 1800, system: `You are a conversion copywriter designing A/B tests. ${NO_HYPE} Each variant must test ONE distinct hypothesis (angle) so results are interpretable. Return strict JSON: {"variants":[{"headline":string,"subhead":string,"angle":string,"hypothesis":string}],"metric":string,"notes":string} with 6 variants.`,
    user: `Placement: ${str(b.placement, 80) || 'landing page hero'}\nCurrent headline: ${base}\nBrief:\n${briefText(b.brief)}` };
});
