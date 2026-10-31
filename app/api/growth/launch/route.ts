import { aiJsonRoute, briefText, NO_HYPE } from '@/lib/growth';
import { str } from '@/lib/http';
export const runtime = 'nodejs';
const TABS = 'strategy|crawl|visibility|competitors|community|articles|ugc|campaign|listing|voice|calendar|influencers|backlinks|hn|analytics|report|tools|email|budget';
/** Launch plan from T-14 to T+14, each task mapped to the Ikarvo tab that does it. */
export const POST = aiJsonRoute(b => ({ maxTokens: 6000,
  system: `You are a launch manager. ${NO_HYPE} Build a realistic launch run-sheet for a small team. Only channels that fit the product. Return strict JSON {"launchDate":string,"narrative":string,"phases":[{"name":string,"window":string,"tasks":[{"day":number,"task":string,"channel":string,"owner":string,"tab":"${TABS}","done_when":string}]}],"risks":[string],"successMetrics":[{"metric":string,"target":string}]}. day is relative to launch day (0). Targets must be framed as assumptions to validate, not promises.`,
  user: `Brief:\n${briefText(b.brief)}\nLaunch date: ${str(b.date, 30) || 'in 3 weeks'}\nWhat is launching: ${str(b.what, 500)}\nTeam size: ${str(b.team, 40) || '1-3'}\nBudget: ${str(b.budget, 60) || 'small'}` }));
