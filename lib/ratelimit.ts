/**
 * Per-IP sliding-window rate limiter.
 *
 * Closes the "create many accounts to evade the per-user quota" hole: even a user who
 * holds valid sessions (or an unauthenticated caller hammering the 401 path) is bounded
 * per source IP across all gated routes.
 *
 * In-memory by design — safe on a Node server (preview / self-hosted) and a useful mitigation
 * on Vercel serverless (state is per-isolate, not global, but still stops fast single-IP floods).
 *
 * Use in any route handler that should be abuse-bounded:
 *   const rl = await rateLimit(clientIp(req), 60, 60_000);
 *   if (!rl.ok) return NextResponse.json({ error: 'Too many requests.' }, { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } });
 */
type Bucket = { hits: number[]; limit: number; windowMs: number };
const buckets = new Map<string, Bucket>();

/** Prune stale entries to bound memory. Runs at most every `min` ms. */
let lastSweep = 0;
function sweep(now: number, min = 30_000) {
  if (now - lastSweep < min) return;
  lastSweep = now;
  for (const [k, b] of buckets) if (b.hits.length === 0 || now - b.hits[0] > b.windowMs) buckets.delete(k);
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  const real = req.headers.get('x-real-ip');
  if (real) return real.trim();
  return '[unknown]';
}

export type RateLimitResult = { ok: true; remaining: number } | { ok: false; retryAfterMs: number };

/**
 * Record one call for `key` and return the decision.
 * @param limit max calls within the window
 * @param windowMs window length
 */
export function rateLimit(key: string, limit = 30, windowMs = 60_000): RateLimitResult {
  const now = Date.now();
  sweep(now);
  let b = buckets.get(key);
  if (!b || now - b.hits[0] > b.windowMs) { b = { hits: [], limit, windowMs }; buckets.set(key, b); }
  // Drop hits that have aged out of the window.
  while (b.hits.length && now - b.hits[0] > b.windowMs) b.hits.shift();
  if (b.hits.length >= b.limit) {
    const retryAfterMs = b.hits[0] + b.windowMs - now;
    return { ok: false, retryAfterMs: Math.max(retryAfterMs, 1000) };
  }
  b.hits.push(now);
  return { ok: true, remaining: b.limit - b.hits.length };
}

/** Convenience: reject response or null when allowed. Pass a Request to key by its source IP. */
export function guard(req: Request, limit = 30, windowMs = 60_000) {
  const r = rateLimit(clientIp(req), limit, windowMs);
  if (r.ok) return null;
  return { status: 429, headers: { 'Retry-After': String(Math.ceil(r.retryAfterMs / 1000)) } };
}
