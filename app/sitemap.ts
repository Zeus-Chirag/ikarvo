import type { MetadataRoute } from "next";

const LegalPages = [
  "/privacy",
  "/terms",
  "/cookies",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://ikarvo.vercel.app",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
    ...LegalPages.map((path) => ({
      url: `https://ikarvo.vercel.app${path}`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    })),
  ];
}
