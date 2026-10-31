import { aiJsonRoute, NO_HYPE, briefText } from '@/lib/growth';
export const runtime = 'nodejs';
export const POST = aiJsonRoute(b => ({ maxTokens: 2000,
  system: `You are a head of growth writing a weekly report for a founder. ${NO_HYPE} Only use numbers present in the data. If a data source is missing, say what to connect. Return strict JSON: {"headline":string,"summary":string,"wins":[string],"concerns":[string],"nextActions":[{"action":string,"why":string,"channel":string}]}`,
  user: `Data for the last 7-28 days (JSON):\n${JSON.stringify(b.data ?? {}).slice(0, 14000)}\n\nBrief:\n${briefText(b.brief)}` }));
