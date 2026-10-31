import { aiJsonRoute, NO_HYPE, briefText } from '@/lib/growth';
import { str } from '@/lib/http';
export const runtime = 'nodejs';
export const maxDuration = 150;
export const POST = aiJsonRoute(b => {
  const topic = str(b.topic, 300); if (topic.length < 4) return 'Give the article a topic or target keyword.';
  return { maxTokens: 7000, system: `You are a senior content strategist and writer producing search- and AI-answer-friendly articles. ${NO_HYPE}
Structure: a direct answer in the first 2 sentences, scannable H2/H3 sections, a comparison table or checklist where useful, an FAQ section (3-5 Qs), and a soft, honest CTA for the product only where relevant. Use the brand voice from the brief. Do not fabricate data or quotes; where a number would help, write [add data].
Return strict JSON: {"title":string,"slug":string,"metaDescription":string (<=155 chars),"keyword":string,"outline":[string],"markdown":string,"faqSchema":[{"q":string,"a":string}]}`,
    user: `Topic / keyword: ${topic}\nAngle: ${str(b.angle, 300)}\nLength: about ${Math.min(2500, Math.max(600, Number(b.words) || 1200))} words\n\nBRIEF:\n${briefText(b.brief)}` };
});
