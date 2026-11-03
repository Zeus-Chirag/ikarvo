import type { MetadataRoute } from 'next';
import { appUrl } from '@/lib/env';

const FALLBACK = 'https://ikarvo.vercel.app';

export default function robots(): MetadataRoute.Robots {
  const base = appUrl(FALLBACK);
  return {
    rules: [
      { userAgent: 'Googlebot', allow: ['/', '/app'] },
      { userAgent: '*', allow: ['/', '/app'], disallow: ['/api/'] },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
