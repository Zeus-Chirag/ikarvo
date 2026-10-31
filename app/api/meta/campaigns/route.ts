import { NextResponse } from 'next/server';
import { readJson, str, fail } from '@/lib/http';
import { CTAS, INSIGHT_FIELDS, OBJECTIVES, fromMinor, graph, isCtx, logEvent, metaCtx, metaFail, normInsight, toMinor, type Objective, type RawInsight } from '@/lib/meta';
export const runtime = 'nodejs'; export const maxDuration = 120; export const dynamic = 'force-dynamic';
type Camp = { id: string; name: string; objective: string; status: string; effective_status: string; daily_budget?: string; lifetime_budget?: string; created_time: string; start_time?: string; stop_time?: string; insights?: { data: RawInsight[] }; adsets?: { data: { id: string; daily_budget?: string; lifetime_budget?: string; optimization_goal?: string; start_time?: string; end_time?: string }[] } };
/** Campaigns on the selected ad account with last-7-day insights. */
export async function GET() {
  const ctx = await metaCtx(); if (!isCtx(ctx)) return ctx;
  try {
    const d = await graph<{ data: Camp[] }>(ctx.conn.token, `${ctx.act}/campaigns`, { params: { fields: `id,name,objective,status,effective_status,daily_budget,lifetime_budget,created_time,start_time,stop_time,adsets{id,daily_budget,lifetime_budget,optimization_goal,start_time,end_time},insights.date_preset(last_7d){${INSIGHT_FIELDS}}`, limit: 50 } });
    const cur = ctx.conn.currency;
    return NextResponse.json({ currency: cur ?? 'USD', campaigns: d.data.map(c => { const s = c.adsets?.data?.[0]; const goal = s?.optimization_goal ?? 'LINK_CLICKS';
      const rt = (OBJECTIVES[c.objective as Objective]?.result as Record<string, string> | undefined)?.[goal] ?? 'link_click';
      return { id: c.id, name: c.name, objective: c.objective, status: c.status, effective: c.effective_status, created: c.created_time, start: s?.start_time ?? c.start_time ?? null, end: s?.end_time ?? c.stop_time ?? null,
        dailyBudget: fromMinor(s?.daily_budget ?? c.daily_budget, cur), lifetimeBudget: fromMinor(s?.lifetime_budget ?? c.lifetime_budget, cur), adsets: c.adsets?.data?.length ?? 0, goal,
        insights: c.insights?.data?.[0] ? normInsight(c.insights.data[0], rt) : null }; }) });
  } catch (e) { return metaFail(e); }
}

type Body = { name?: string; objective?: string; optimizationGoal?: string; targeting?: Record<string, unknown>; dailyBudget?: number; lifetimeBudget?: number; startTime?: string; endTime?: string;
  videoId?: string; link?: string; message?: string; headline?: string; description?: string; cta?: string; instagramActorId?: string };
/**
 * Creates campaign → ad set → creative → ad, ALL with status PAUSED. Nothing spends until the user confirms Launch
 * (POST /api/meta/campaigns/{id} {action:"launch", confirm:"LAUNCH"}). If a later step fails, the PAUSED objects that
 * were already created are returned so nothing is orphaned silently.
 */
export async function POST(req: Request) {
  const ctx = await metaCtx(); if (!isCtx(ctx)) return ctx;
  if (!ctx.conn.pageId) return fail(409, 'Pick the Facebook Page your ads run as (Integrations → Meta Ads). Meta requires a Page for every ad creative.', ctx.conn.source === 'env' ? ['FACEBOOK_PAGE_ID'] : undefined);
  const b = await readJson<Body>(req); if (!b) return fail(400, 'Send JSON.');
  const objective = (b.objective ?? 'OUTCOME_TRAFFIC') as Objective; if (!OBJECTIVES[objective]) return fail(400, `objective must be one of ${Object.keys(OBJECTIVES).join(', ')}.`);
  const goal = b.optimizationGoal && (OBJECTIVES[objective].goals as readonly string[]).includes(b.optimizationGoal) ? b.optimizationGoal : OBJECTIVES[objective].goals[0];
  const link = str(b.link, 800); if (!/^https:\/\/\S+\.\S+/.test(link)) return fail(400, 'Add the https:// landing page the ad sends people to.');
  const videoId = str(b.videoId, 40); if (!/^\d+$/.test(videoId)) return fail(400, 'Pick an Ad Studio video that is uploaded to the ad account.');
  const message = str(b.message, 2000); if (!message) return fail(400, 'Add the primary text.');
  if (!b.targeting || typeof b.targeting !== 'object' || !(b.targeting as { geo_locations?: unknown }).geo_locations) return fail(400, 'Targeting needs at least one location.');
  const daily = Number(b.dailyBudget) || 0; const lifetime = Number(b.lifetimeBudget) || 0; if (daily <= 0 && lifetime <= 0) return fail(400, 'Set a daily or lifetime budget.');
  const start = b.startTime ? new Date(b.startTime) : new Date(Date.now() + 36e5); const end = b.endTime ? new Date(b.endTime) : null;
  if (isNaN(+start) || (end && (isNaN(+end) || end <= start))) return fail(400, 'Schedule end must be after the start.');
  if (lifetime > 0 && !end) return fail(400, 'A lifetime budget needs an end date.');
  const cta = CTAS.includes(b.cta ?? '') ? b.cta! : 'LEARN_MORE'; const name = str(b.name, 200) || `Ikarvo · ${new Date().toISOString().slice(0, 10)}`; const cur = ctx.conn.currency; const t = ctx.conn.token;
  const made: { campaignId?: string; adsetId?: string; creativeId?: string; adId?: string } = {};
  try {
    const camp = await graph<{ id: string }>(t, `${ctx.act}/campaigns`, { method: 'POST', params: { name, objective, status: 'PAUSED', special_ad_categories: [], buying_type: 'AUCTION', is_adset_budget_sharing_enabled: false } });
    made.campaignId = camp.id; await logEvent(ctx, 'campaign', camp.id, 'created', { name, objective });
    const targeting = { ...b.targeting, targeting_automation: { advantage_audience: 0 } };
    const adset = await graph<{ id: string }>(t, `${ctx.act}/adsets`, { method: 'POST', params: { name: `${name} · ad set`, campaign_id: camp.id, status: 'PAUSED', billing_event: 'IMPRESSIONS', optimization_goal: goal, bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
      ...(daily > 0 ? { daily_budget: toMinor(daily, cur) } : { lifetime_budget: toMinor(lifetime, cur) }), start_time: start.toISOString(), ...(end ? { end_time: end.toISOString() } : {}), targeting,
      ...(goal === 'LANDING_PAGE_VIEWS' || goal === 'LINK_CLICKS' ? { destination_type: 'WEBSITE' } : {}) } });
    made.adsetId = adset.id; await logEvent(ctx, 'adset', adset.id, 'created', { daily, lifetime, start: start.toISOString(), end: end?.toISOString() ?? null });
    // A video creative needs a thumbnail; use Meta's own generated one.
    const th = await graph<{ data: { uri: string; is_preferred?: boolean }[] }>(t, `${videoId}/thumbnails`).catch(() => ({ data: [] as { uri: string; is_preferred?: boolean }[] }));
    const thumb = th.data.find(x => x.is_preferred)?.uri ?? th.data[0]?.uri; if (!thumb) throw new Error('Meta has not finished processing this video (no thumbnail yet). Wait a minute and try again; the campaign and ad set are saved PAUSED.');
    const creative = await graph<{ id: string }>(t, `${ctx.act}/adcreatives`, { method: 'POST', params: { name: `${name} · creative`, object_story_spec: { page_id: ctx.conn.pageId, ...(b.instagramActorId ? { instagram_user_id: str(b.instagramActorId, 40) } : {}),
      video_data: { video_id: videoId, image_url: thumb, message, title: str(b.headline, 255) || undefined, link_description: str(b.description, 255) || undefined, call_to_action: { type: cta, value: { link } } } } } });
    made.creativeId = creative.id; await logEvent(ctx, 'creative', creative.id, 'created', { videoId });
    const ad = await graph<{ id: string }>(t, `${ctx.act}/ads`, { method: 'POST', params: { name: `${name} · ad`, adset_id: adset.id, creative: { creative_id: creative.id }, status: 'PAUSED' } });
    made.adId = ad.id; await logEvent(ctx, 'ad', ad.id, 'created', {});
    return NextResponse.json({ ok: true, status: 'PAUSED', ...made, note: 'Created PAUSED. Nothing spends until you confirm Launch.' });
  } catch (e) {
    const r = metaFail(e); const d = await r.json();
    return NextResponse.json({ ...d, partial: made, note: made.campaignId ? 'Objects created before the failure are PAUSED and will not spend. Fix the issue and retry, or delete them in Ads Manager.' : undefined }, { status: r.status });
  }
}
