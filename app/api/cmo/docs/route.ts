import { aiJsonRoute, NO_HYPE, briefText } from '@/lib/growth';
import { str } from '@/lib/http';
export const runtime = 'nodejs';
export const maxDuration = 120;
const SPECS: Record<string, string> = {
  competitors: '{"summary":string,"competitors":[{"name":string,"domain":string,"positioning":string,"pricing":string,"strengths":[string],"weaknesses":[string],"howToWin":string}],"gaps":[string],"verifyFirst":[string]}',
  calendar: '{"theme":string,"weeks":[{"week":number,"focus":string,"items":[{"day":number,"channel":string,"format":string,"title":string,"hook":string}]}]}',
  design: '{"personality":[string],"colors":[{"name":string,"hex":string,"use":string}],"typography":{"display":string,"body":string,"notes":string},"imagery":string,"doNot":[string],"adRules":[string]}',
  content: '{"pillars":[{"name":string,"why":string,"formats":[string],"exampleTitles":[string]}],"channels":[{"channel":string,"cadence":string,"role":string}],"seoClusters":[{"hub":string,"spokes":[string]}],"distribution":string,"metrics":[string]}',
};
/** Extra context documents generated from the brief: competitor analysis, content calendar, design guide, content strategy. */
export const POST = aiJsonRoute(b => {
  const doc = str(b.doc, 20); const shape = SPECS[doc]; if (!shape) return 'doc must be competitors, calendar, design or content.';
  return { maxTokens: 5000, system: `You are a CMO writing one internal ${doc} document for a team. ${NO_HYPE} Mark guesses as "Assumption:". Language: ${str(b.language, 40) || 'English'}. Return strict JSON: ${shape}`,
    user: `Brief:\n${briefText(b.brief)}\n\n${doc === 'design' ? `Signals extracted from the live site (colors, fonts):\n${briefText(b.signals)}\n` : ''}${doc === 'competitors' ? `Known competitors and live snapshots:\n${briefText(b.signals)}\n` : ''}General instructions from the owner:\n${str(b.instructions, 4000)}` };
});
