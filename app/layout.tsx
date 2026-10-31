import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Instrument_Serif, Hanken_Grotesk, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { THEME_BOOT } from '@/components/ThemeToggle';
import { appUrl } from '@/lib/env';

const display = Instrument_Serif({ subsets: ['latin'], weight: '400', style: ['normal', 'italic'], variable: '--font-display' });
const sans = Hanken_Grotesk({ subsets: ['latin'], variable: '--font-sans' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

const title = 'Ikarvo: build the product, then sell it';
const description = 'Prompt-to-app builder with live preview, GitHub and Vercel shipping, UGC and motion ad studio, and a marketing planner. One workspace.';

export const metadata: Metadata = {
  metadataBase: new URL(appUrl('https://ikarvo.vercel.app')),
  title,
  description,
  applicationName: 'Ikarvo',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: 'Ikarvo',
    title,
    description,
    url: '/',
    locale: 'en',
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="en" suppressHydrationWarning className={`${display.variables} ${sans.variables} ${mono.variables}`}><head><script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} /></head><body>{children}</body></html>;
}
