import type { NextConfig } from 'next';
// NEXT_DIST_DIR lets two dev servers (e.g. preview + test) run from one checkout without clobbering .next
const nextConfig: NextConfig = { poweredByHeader: false, devIndicators: false, distDir: process.env.NEXT_DIST_DIR || '.next',
  // Render <title>/<meta> in <head> for every client (not streamed), so crawlers, link unfurlers and audits all see them.
  htmlLimitedBots: /.*/ };
export default nextConfig;
