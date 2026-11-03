import type { MetadataRoute } from 'next';
import { appUrl } from '@/lib/env';

const FALLBACK = 'https://ikarvo.vercel.app';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = appUrl(FALLBACK);
  const legal = [
    '/legal/privacy', '/legal/terms', '/legal/cookies',
    '/legal/security', '/legal/acceptable-use', '/legal/about', '/legal/no-sale',
    '/legal/refund', '/legal/contact', '/legal/dmca', '/legal/accessibility',
  ];
  return [
    { url: base, changeFrequency: 'weekly' as const, priority: 1 },
    { url: `${base}/app`, changeFrequency: 'weekly' as const, priority: 0.5 },
    { url: `${base}/pricing`, changeFrequency: 'monthly' as const, priority: 0.8 },
    ...legal.map(p => ({ url: `${base}${p}`, changeFrequency: 'yearly' as const, priority: 0.2 })),
  ];
}
