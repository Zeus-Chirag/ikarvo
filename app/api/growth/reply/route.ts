import { aiJsonRoute, NO_HYPE, briefText } from '@/lib/growth';
import { str } from '@/lib/http';
export const runtime = 'nodejs';
export const POST = aiJsonRoute(b => {
  const title = str(b.title, 400); if (!title) return 'Pick a thread first.';
  return { maxTokens: 1200, system: `You draft replies to community threads (Reddit, Hacker News) on behalf of a founder. ${NO_HYPE}
The reply must genuinely help the original poster first. Mention the product at most once, only if relevant, and always disclose affiliation ("I work on X" / "I built X"). Match the community's tone: plain text, no marketing language, no emojis, no links unless asked. If the product is not a fit, say so and give neutral advice instead.
Return strict JSON: {"fit":"strong"|"weak"|"none","why":string,"reply":string}`,
    user: `Community: ${str(b.source, 40)} ${str(b.community, 80)}\nThread title: ${title}\nThread text: ${str(b.text, 3000)}\n\nOUR BRIEF:\n${briefText(b.brief)}` };
});
