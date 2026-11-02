import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Instrument_Serif, Hanken_Grotesk, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { THEME_BOOT } from '@/components/ThemeToggle';
import CookieNotice from '@/components/CookieNotice';
import { appUrl } from '@/lib/env';

const display = Instrument_Serif({ subsets: ['latin'], weight: '400', style: ['normal', 'italic'], variable: '--font-display' });
const sans = Hanken_Grotesk({ subsets: ['latin'], variable: '--font-sans' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'Ikarvo: build the product, then sell it',
  description: 'Prompt-to-app builder with live preview, GitHub and Vercel shipping, UGC and motion ad studio, and a marketing planner. One workspace.',
  applicationName: 'Ikarvo',
  metadataBase: new URL(appUrl('https://ikarvo-lp0c2c5p0-chiragkoshti0628-rgbs-projects.vercel.app')),
  alternates: { canonical: '/' },
  openGraph: { type: 'website', siteName: 'Ikarvo', title: 'Ikarvo: build the product, then sell it', description: 'Prompt-to-app builder, ad studio and marketing planner in one workspace.', url: '/', locale: 'en_US' },
  twitter: { card: 'summary_large_image', title: 'Ikarvo: build the product, then sell it', description: 'Prompt-to-app builder, ad studio and marketing planner in one workspace.' },
  icons: { icon: '/icon.svg' },
  robots: { index: true, follow: true },
};

export const viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="en" suppressHydrationWarning className={`${display.variable} ${sans.variable} ${mono.variable}`}><head><script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} /></head><body>{children}<CookieNotice /></body></html>;
}
