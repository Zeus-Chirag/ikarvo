import type { NextConfig } from 'next';

const productionHeaders = [
  // HSTS must be set on the server (cannot be added safely via middleware over non-secure origins).
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
];

// NEXT_DIST_DIR lets two dev servers (e.g. preview + test) run from one checkout without clobbering .next
const nextConfig: NextConfig = {
  poweredByHeader: false, devIndicators: false, distDir: process.env.NEXT_DIST_DIR || '.next',
  // Render <title>/<meta> in <head> for every client (not streamed), so crawlers, link unfurlers and audits all see them.
  htmlLimitedBots: /.*/,
  async redirects() {
    return [{ source: '/favicon.ico', destination: '/icon.svg', permanent: true }];
  },
  async rewrites() {
    return [{ source: '/.well-known/security.txt', destination: '/security.txt' }];
  },
  async headers() {
    if (process.env.NODE_ENV !== 'production') return [];
    // These only apply to production: the dev server needs eval for HMR and must stay reachable on plain HTTP.
    return [
      { source: '/:path*', headers: productionHeaders },
    ];
  },
};
export default nextConfig;
