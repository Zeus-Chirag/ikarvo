import { aiJsonRoute, NO_HYPE } from '@/lib/growth';
import { str } from '@/lib/http';
export const runtime = 'nodejs';
export const maxDuration = 120;
// Turns crawled page content into the shared strategy documents every other generator reads.
export const POST = aiJsonRoute(b => {
  const page = str(b.pageText, 12000); const url = str(b.url, 300);
  if (page.length < 80 && str(b.notes, 2000).length < 40) return 'Run the site audit first (or add notes about the product).';
  return { maxTokens: 6000, system: `You are a head of marketing writing internal strategy documents from a company's own website. ${NO_HYPE}
Only state facts supported by the page text or the owner's notes; label anything else "Assumption:". For competitors, name only well-known companies you are confident operate in this exact category, and say so if unsure.
Return strict JSON:
{"product":{"name":string,"oneLiner":string,"whatItDoes":string,"features":[string],"pricingSeen":string,"category":string},
 "positioning":{"icp":[{"segment":string,"pain":string,"trigger":string}],"statement":string,"messagingPillars":[{"pillar":string,"proof":string}],"objections":[{"objection":string,"answer":string}]},
 "competitors":[{"name":string,"angle":string,"howWeDiffer":string}],
 "voice":{"traits":[string],"do":[string],"dont":[string],"sampleLine":string},
 "keywords":[{"keyword":string,"intent":"informational"|"commercial"|"transactional","why":string}],
 "plan":[{"week":1|2|3|4,"focus":string,"actions":[{"channel":string,"task":string,"effort":"S"|"M"|"L"}]}]}
Give 8-12 keywords and 3-5 actions per week.`,
    user: `URL: ${url}\nTitle: ${str(b.title, 200)}\nMeta description: ${str(b.description, 300)}\nOwner notes: ${str(b.notes, 2000) || '(none)'}\n\nPAGE TEXT:\n${page}` };
});
