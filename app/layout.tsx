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
  description: 'One workspace to build, ship and market your product: a prompt-to-app builder with live preview, an ad studio for UGC and motion ads, and an AI marketing planner. Free to start.',
  applicationName: 'Ikarvo',
  metadataBase: new URL(appUrl('https://ikarvo.vercel.app')),
  alternates: { canonical: '/' },
  openGraph: { type: 'website', siteName: 'Ikarvo', title: 'Ikarvo: build the product, then sell it', description: 'Prompt-to-app builder, ad studio and marketing planner in one workspace.', url: '/', locale: 'en_US' },
  twitter: { card: 'summary_large_image', title: 'Ikarvo: build the product, then sell it', description: 'Prompt-to-app builder, ad studio and marketing planner in one workspace.' },
  icons: { icon: '/icon.svg', apple: '/icon.svg' },
  title: { default: 'Ikarvo: build the product, then sell it', template: '%s | Ikarvo' },
  robots: { index: true, follow: true },
};

export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#14120f' };

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="en" suppressHydrationWarning className={`${display.variable} ${sans.variable} ${mono.variable}`}><head><script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} /></head><body>{children}<CookieNotice /></body></html>;
}
