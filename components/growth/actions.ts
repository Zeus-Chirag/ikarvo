import type { Handoff } from '../ws';

type Issue = { severity?: string; message: string };
/** Build Studio brief that rebuilds a page with its audit issues fixed. */
export function fixPagePrompt(o: { url: string; title?: string; description?: string; h1?: string[]; text?: string; issues: Issue[]; brief?: string }) {
  return [`Rebuild the page ${o.url} as a fast, accessible, single-file page with these problems fixed:`, ...o.issues.map(i => `- ${i.severity ? `[${i.severity}] ` : ''}${i.message}`),
    '', 'Keep the meaning of the current page:', o.title && `Current title: ${o.title}`, o.description && `Current description: ${o.description}`, o.h1?.length && `Current H1: ${o.h1.join(' / ')}`, o.text && `Current copy (excerpt): ${o.text.slice(0, 1200)}`,
    o.brief && `\nBrand brief:\n${o.brief.slice(0, 1200)}`,
    '', 'Requirements: one H1, title under 60 characters, meta description 120-160 characters, canonical link, Open Graph tags with og:image, Organization + WebPage JSON-LD, alt text on every image, a clear primary call to action.'].filter(Boolean).join('\n');
}

type Snap = { domain: string; home: { title?: string; desc?: string; heads?: string[]; prices?: string[]; ctas?: string[] }; pricing: { prices?: string[]; status: number } };
/** Landing page that positions against one competitor, using what their site actually says. */
export function beatPrompt(s: Snap, brief: string) {
  return [`A landing page that wins buyers comparing us with ${s.domain}.`, '', `What ${s.domain} says today (from a live snapshot):`, `- Title: ${s.home.title ?? ''}`, `- Pitch: ${s.home.desc ?? ''}`,
    `- Headings: ${(s.home.heads ?? []).slice(0, 8).join(' | ')}`, `- Prices seen: ${[...(s.pricing.prices ?? []), ...(s.home.prices ?? [])].slice(0, 8).join(', ') || 'none published'}`, `- Their CTAs: ${(s.home.ctas ?? []).join(', ')}`,
    '', brief ? `Our product:\n${brief.slice(0, 1500)}` : 'Our product: (describe it here)',
    '', 'Structure: a headline that names the gap they leave open, a "why teams switch" section, an honest comparison table (mark any claim about them we have not verified as "check"), pricing clarity, migration steps, FAQ, sign-up form. No made-up testimonials or stats.'].join('\n');
}

/** Where a plan / report task should take the user. */
export function routeTask(channel: string, task: string, from: string): Handoff {
  const c = channel.toLowerCase();
  if (/seo|site|technical|schema/.test(c)) return { kind: 'tab', tab: 'crawl', from };
  if (/blog|content|article|search/.test(c)) return { kind: 'article', topic: task.slice(0, 200), from };
  if (/ad|video|tiktok|reels|creative|paid/.test(c)) return { kind: 'ad', angle: task.slice(0, 300), from };
  if (/landing|product|build|page|conversion/.test(c)) return { kind: 'build', prompt: task, from };
  if (/reddit|community|hn|forum/.test(c)) return { kind: 'tab', tab: 'community', from };
  if (/outreach|influencer|creator|partner/.test(c)) return { kind: 'tab', tab: 'influencers', from };
  if (/backlink|pr|link/.test(c)) return { kind: 'tab', tab: 'backlinks', from };
  return { kind: 'post', text: task, channel: /linkedin/.test(c) ? 'LinkedIn' : /thread/.test(c) ? 'Threads' : 'X', from };
}
