import { aiJsonRoute, briefText, NO_HYPE } from '@/lib/growth';
import { str } from '@/lib/http';
export const runtime = 'nodejs';
const KINDS: Record<string, string> = { onboarding: 'new sign-up onboarding (activation)', trial: 'trial-to-paid conversion', nurture: 'lead nurture for people who downloaded something but have not signed up', winback: 'win-back for churned or inactive users', launch: 'launch announcement to an existing list' };
/** Lifecycle email sequence with send timing, trigger, subject/preview A/B and plain-text bodies. */
export const POST = aiJsonRoute(b => {
  const kind = str(b.kind, 20); if (!KINDS[kind]) return `kind must be one of ${Object.keys(KINDS).join(', ')}.`;
  return { maxTokens: 6000, system: `You are a lifecycle marketer writing a ${KINDS[kind]} email sequence. ${NO_HYPE} Each email has one job and one link. Plain text, short paragraphs, sign off as the founder. Use {{first_name}} and {{cta_url}} placeholders only. Return strict JSON {"goal":string,"audience":string,"emails":[{"day":number,"trigger":string,"subjectA":string,"subjectB":string,"preview":string,"body":string,"cta":string,"job":string}],"metrics":[string],"exitRule":string} with ${Math.min(7, Math.max(3, Number(b.count) || 5))} emails.`,
    user: `Brief:\n${briefText(b.brief)}\nActivation event / key action: ${str(b.activation, 300) || 'unknown, infer it'}\nNotes: ${str(b.notes, 1500)}` };
});
