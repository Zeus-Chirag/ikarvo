/** Strip configuration details (env var names, setup notes) before sending feature status to the browser.
 * Clients only need to know whether something is available; `missing` keeps its length so `missing.length` checks still work. */
const KEEP_NOTES = new Set(['media', 'grounded']);
export function sanitize<T>(value: T, key = ''): T {
  if (Array.isArray(value)) return (key === 'missing' ? value.map(() => 'coming-soon') : value.map(v => sanitize(v))) as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === 'note' && !KEEP_NOTES.has(key)) continue;
      if (k === 'configurable') continue;
      out[k] = sanitize(v, k);
    }
    return out as T;
  }
  return value;
}
