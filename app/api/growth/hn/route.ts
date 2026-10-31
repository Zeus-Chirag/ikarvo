import { aiJsonRoute, briefText } from '@/lib/growth';
import { str } from '@/lib/http';
export const runtime = 'nodejs';
/** Show HN drafts (three variations). Posting stays manual: HN has no posting API and frowns on automation. */
export const POST = aiJsonRoute(b => ({ maxTokens: 2500,
  system: 'You draft Show HN posts the way experienced HN founders write them: plain title starting "Show HN:", no marketing adjectives, first-person body (80-150 words) covering what it is, why you built it, how it works technically, what is rough, and a question for feedback. No emojis, no superlatives, no invented numbers. Return strict JSON {"variants":[{"title":string,"url":string,"body":string,"angle":string}],"bestTime":string,"firstCommentTips":[string]} with 3 variants.',
  user: `Brief:\n${briefText(b.brief)}\nURL: ${str(b.url, 300)}\nTechnical notes from the founder: ${str(b.notes, 2000)}` }));
