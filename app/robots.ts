import type { MetadataRoute } from "next";

const LegalPages = [
  "/privacy",
  "/terms",
  "/cookies",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: "https://ikarvo.vercel.app/sitemap.xml",
  };
}

export function sitemap() {
  return [
    {
      url: "https://ikarvo.vercel.app",
      lastModified: new Date(),
    },
    ...LegalPages.map((path) => ({
      url: `https://ikarvo.vercel.app${path}`,
      lastModified: new Date(),
    })),
  ];
}
