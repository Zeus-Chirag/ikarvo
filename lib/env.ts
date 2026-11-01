// Central, server-only view of configuration. Never return secret values from here.
const v = (k: string) => (process.env[k] ?? '').trim();
export const envValue = v;

export function isPreviewMode() {
  // Preview mode skips sign-in and keeps data in the browser. Dev-only unless explicitly allowed.
  if (v('PREVIEW_MODE') !== '1') return false;
  return process.env.NODE_ENV !== 'production' || v('ALLOW_PREVIEW_IN_PRODUCTION') === '1';
}

const trimSlash = (u: string) => u.trim().replace(/\/+$/, '');
const LOOPBACK_HOSTS = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]|::1)$/i;
function isLoopbackUrl(u: string) {
  try { return LOOPBACK_HOSTS.test(new URL(u).hostname); } catch { return false; }
}

/**
 * Public origin used to build OAuth redirect URIs (and Stripe return URLs).
 *
 * APP_URL wins when it is a real address. But .env.example ships APP_URL=http://localhost:3000,
 * so a copied env file points every callback at the user's own machine and the provider bounces
 * them to a dead localhost URL. When APP_URL is loopback and the request did not come from
 * loopback, the request origin wins instead.
 */
export function appUrl(fallbackOrigin?: string) {
  const explicit = trimSlash(v('APP_URL') || v('NEXT_PUBLIC_APP_URL') || '');
  const requestOrigin = fallbackOrigin ? trimSlash(fallbackOrigin) : '';
  if (explicit && !(isLoopbackUrl(explicit) && requestOrigin && !isLoopbackUrl(requestOrigin))) return explicit;
  return requestOrigin || explicit || 'http://localhost:3000';
}

/**
 * The public origin of a request. Behind a proxy/load balancer the URL the runtime reports can be
 * an internal address (http://127.0.0.1:3000), so forwarded headers are the source of truth.
 */
export function requestOrigin(req: Request) {
  const first = (value: string | null) => (value ?? '').split(',')[0].trim();
  const host = first(req.headers.get('x-forwarded-host')) || first(req.headers.get('host'));
  if (host) {
    const bareHost = host.replace(/:\d+$/, '');
    const proto = first(req.headers.get('x-forwarded-proto')) || (LOOPBACK_HOSTS.test(bareHost) ? 'http' : 'https');
    return `${proto}://${host}`;
  }
  return new URL(req.url).origin;
}

/** The exact callback URL a provider must have registered. Used in errors so the fix is unambiguous. */
export function callbackUrl(req: Request, provider: string) {
  return `${appUrl(requestOrigin(req))}/api/${provider}/callback`;
}

export type FeatureKey = 'supabase' | 'ai' | 'github' | 'vercel' | 'stripe' | 'media' | 'sessions' | 'x' | 'linkedin' | 'wordpress' | 'reddit' | 'google' | 'search' | 'youtube' | 'xsearch' | 'grounded' | 'scheduler' | 'meta';
export type Feature = { ok: boolean; label: string; missing: string[]; note?: string };

function need(keys: string[]) { return keys.filter(k => !v(k)); }

export function featureStatus(): Record<FeatureKey, Feature> & { preview: boolean } {
  const supa = need(['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY']);
  const ai = need(['AI_API_KEY']);
  const sessions = need(['SESSION_SECRET']);
  const gh = need(['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET', 'SESSION_SECRET']);
  const vercelOAuth = need(['VERCEL_CLIENT_ID', 'VERCEL_CLIENT_SECRET', 'VERCEL_INTEGRATION_SLUG', 'SESSION_SECRET']);
  const vercelToken = !!v('VERCEL_TOKEN');
  const stripe = need(['STRIPE_SECRET_KEY', 'STRIPE_PRICE_ID']);
  const replicate = !!v('REPLICATE_API_TOKEN'); const fal = !!v('FAL_KEY');
  return {
    preview: isPreviewMode(),
    supabase: { ok: !supa.length, label: 'Supabase auth & database', missing: supa },
    ai: { ok: !ai.length, label: 'AI generation (OpenAI-compatible)', missing: ai, note: `Model: ${v('AI_MODEL') || 'openai/gpt-4o-mini'} via ${v('AI_BASE_URL') || 'https://openrouter.ai/api/v1'}` },
    sessions: { ok: !sessions.length, label: 'Encrypted integration sessions', missing: sessions },
    github: { ok: !gh.length, label: 'GitHub OAuth + repo push', missing: gh },
    vercel: { ok: !vercelOAuth.length || vercelToken, label: 'Vercel deploy', missing: vercelToken ? [] : vercelOAuth, note: vercelToken && vercelOAuth.length ? 'Using server VERCEL_TOKEN (single-owner mode).' : undefined },
    stripe: { ok: !stripe.length, label: 'Stripe billing', missing: stripe, note: v('STRIPE_WEBHOOK_SECRET') && v('SUPABASE_SERVICE_ROLE_KEY') ? undefined : 'Set STRIPE_WEBHOOK_SECRET and SUPABASE_SERVICE_ROLE_KEY so paid plans sync to profiles.' },
    x: { ok: !!v('X_ACCESS_TOKEN'), label: 'Publish to X', missing: need(['X_ACCESS_TOKEN']) },
    linkedin: { ok: !need(['LINKEDIN_ACCESS_TOKEN', 'LINKEDIN_AUTHOR_URN']).length, label: 'Publish to LinkedIn', missing: need(['LINKEDIN_ACCESS_TOKEN', 'LINKEDIN_AUTHOR_URN']) },
    wordpress: { ok: !need(['WORDPRESS_URL', 'WORDPRESS_USER', 'WORDPRESS_APP_PASSWORD']).length, label: 'Publish articles to WordPress', missing: need(['WORDPRESS_URL', 'WORDPRESS_USER', 'WORDPRESS_APP_PASSWORD']) },
    reddit: { ok: !need(['REDDIT_CLIENT_ID', 'REDDIT_CLIENT_SECRET']).length, label: 'Reddit search (OAuth, optional)', missing: need(['REDDIT_CLIENT_ID', 'REDDIT_CLIENT_SECRET']), note: 'Hacker News search needs no key; Reddit falls back to anonymous search, which Reddit often blocks.' },
    google: { ok: !need(['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'SESSION_SECRET']).length, label: 'Google Search Console + GA4', missing: need(['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'SESSION_SECRET']) },
    search: { ok: !!(v('BRAVE_SEARCH_API_KEY') || v('SERPER_API_KEY')), label: 'Web search (backlink finder)', missing: v('BRAVE_SEARCH_API_KEY') || v('SERPER_API_KEY') ? [] : ['BRAVE_SEARCH_API_KEY or SERPER_API_KEY'] },
    youtube: { ok: !!v('YOUTUBE_API_KEY'), label: 'YouTube creator search', missing: need(['YOUTUBE_API_KEY']) },
    xsearch: { ok: !!v('X_BEARER_TOKEN'), label: 'X creator search', missing: need(['X_BEARER_TOKEN']) },
    grounded: { ok: !!v('PERPLEXITY_API_KEY') || (!!v('AI_API_KEY') && (v('AI_BASE_URL') || 'https://openrouter.ai').includes('openrouter.ai')), label: 'Search-grounded AI visibility', missing: v('PERPLEXITY_API_KEY') || (v('AI_API_KEY') && (v('AI_BASE_URL') || 'https://openrouter.ai').includes('openrouter.ai')) ? [] : ['PERPLEXITY_API_KEY (or OpenRouter AI_API_KEY)'], note: v('PERPLEXITY_API_KEY') ? 'Perplexity Sonar' : 'OpenRouter :online' },
    scheduler: { ok: !need(['CRON_SECRET', 'SCHEDULER_OWNER_USER_ID', 'SUPABASE_SERVICE_ROLE_KEY']).length, label: 'Background auto-publisher (cron)', missing: need(['CRON_SECRET', 'SCHEDULER_OWNER_USER_ID', 'SUPABASE_SERVICE_ROLE_KEY']), note: 'Runs /api/cron/publish every 10 min on Vercel Cron (vercel.json).' },
    meta: { ok: !need(['META_APP_ID', 'META_APP_SECRET', 'SESSION_SECRET']).length, label: 'Meta Ads (Marketing API OAuth)', missing: need(['META_APP_ID', 'META_APP_SECRET', 'SESSION_SECRET']) },
    media: { ok: replicate || fal, label: 'AI image/video (Replicate or fal)', missing: replicate || fal ? [] : ['REPLICATE_API_TOKEN or FAL_KEY'], note: replicate ? 'Provider: Replicate' : fal ? 'Provider: fal' : undefined },
  };
}
