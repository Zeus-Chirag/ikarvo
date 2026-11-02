import type { MetadataRoute } from 'next';
import { appUrl } from '@/lib/env';

const FALLBACK = 'https://ikarvo-lp0c2c5p0-chiragkoshti0628-rgbs-projects.vercel.app';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = appUrl(FALLBACK);
  const legal = [
    '/legal/privacy', '/legal/terms', '/legal/cookies',
    '/legal/security', '/legal/acceptable-use', '/legal/about',
  ];
  return [
    { url: base, changeFrequency: 'weekly' as const, priority: 1 },
    { url: `${base}/app`, changeFrequency: 'weekly' as const, priority: 0.5 },
    ...legal.map(p => ({ url: `${base}${p}`, changeFrequency: 'yearly' as const, priority: 0.2 })),
    { url: `${base}/security.txt`, changeFrequency: 'yearly' as const, priority: 0.1 },
  ];
}
