import { aiJsonRoute, NO_HYPE, briefText } from '@/lib/growth';
import { str } from '@/lib/http';
export const runtime = 'nodejs';
// Drafts only. Ikarvo never sends outreach.
export const POST = aiJsonRoute(b => {
  const target = str(b.target, 2000); if (!target) return 'Pick a creator or site first.';
  const kind = str(b.kind, 20) === 'backlink' ? 'backlink' : 'influencer';
  return { maxTokens: 1200, system: `You write short, personal cold outreach for a founder. ${NO_HYPE}
${kind === 'influencer' ? 'Goal: propose a paid or product-for-review collaboration. Reference something specific from their content. Be clear it is sponsored if paid; mention disclosure (#ad) expectations.' : 'Goal: earn a link (guest post pitch, resource inclusion, listicle addition, or correction). Offer something useful to their readers. Never offer payment for a followed link (search-engine link schemes).'}
Under 130 words. No flattery clichés. One clear ask. Return strict JSON: {"subject":string,"message":string,"followUp":string}`,
    user: `Target:\n${target}\n\nOur brief:\n${briefText(b.brief)}\nSender name: ${str(b.sender, 80) || 'the founder'}` };
});
