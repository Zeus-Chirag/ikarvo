import type { MetadataRoute } from 'next';
import { appUrl } from '@/lib/env';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = appUrl('https://ikarvo.vercel.app').replace(/\/+$/, '');
  const lastModified = new Date();
  return [
    { url: `${base}/`, lastModified, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/help`, lastModified, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/privacy`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/terms`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
  ];
}
