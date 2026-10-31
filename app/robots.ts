import type { MetadataRoute } from 'next';
import { appUrl } from '@/lib/env';

const base = () => appUrl('https://ikarvo.vercel.app').replace(/\/+$/, '');

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/app/', '/auth/'],
      },
      {
        // Answer engines are welcome here: being quoted is distribution.
        userAgent: ['GPTBot', 'OAI-SearchBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended'],
        allow: '/',
      },
    ],
    sitemap: `${base()}/sitemap.xml`,
  };
}
