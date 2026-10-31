const P: Record<string, string> = {
  build: 'M4 17l6-6-6-6M12 19h8',
  folder: 'M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z',
  film: 'M4 4h16v16H4zM8 4v16M16 4v16M4 9h4M16 9h4M4 15h4M16 15h4',
  megaphone: 'M3 11v2a1 1 0 001 1h3l5 4V6L7 10H4a1 1 0 00-1 1zM16 8a5 5 0 010 8M19 5a9 9 0 010 14',
  plug: 'M9 7V3M15 7V3M6 7h12v4a6 6 0 01-12 0zM12 17v4',
  card: 'M3 6h18v12H3zM3 10h18M7 15h3',
  arrow: 'M5 12h14M13 6l6 6-6 6', search: 'M11 18a7 7 0 100-14 7 7 0 000 14zM20 20l-4-4', moon: 'M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z',
  plus: 'M12 5v14M5 12h14',
  'chevron-down': 'M6 9l6 6 6-6', 'chevron-up': 'M6 15l6-6 6 6', mic: 'M9 4a3 3 0 016 0v7a3 3 0 01-6 0zM5 11a7 7 0 0014 0M12 18v3', user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0', upload: 'M12 20V9M7 14l5-5 5 5M5 4h14', layers: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  github: 'M9 19c-4 1.5-4-2-6-2.5M15 21v-3.5a3 3 0 00-.8-2.3c2.7-.3 5.6-1.3 5.6-6a4.6 4.6 0 00-1.3-3.2 4.3 4.3 0 00-.1-3.2s-1-.3-3.4 1.3a11.6 11.6 0 00-6 0C6.6 2.5 5.6 2.8 5.6 2.8a4.3 4.3 0 00-.1 3.2A4.6 4.6 0 004.2 9.2c0 4.6 2.8 5.7 5.5 6a3 3 0 00-.8 2.3V21',
  triangle: 'M12 4l9 16H3z',
  play: 'M7 5l12 7-12 7z', pause: 'M7 5h4v14H7zM13 5h4v14h-4z',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  copy: 'M8 8h12v12H8zM4 16V4h12',
  check: 'M5 12l5 5L20 7', x: 'M6 6l12 12M18 6L6 18',
  spark: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  image: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15 9h.01',
  monitor: 'M3 4h18v12H3zM8 20h8M12 16v4', laptop: 'M5 5h14v10H5zM2 19h20', sliders: 'M4 6h16M4 12h16M4 18h16M9 4v4M15 10v4M7 16v4', phone: 'M7 2h10v20H7zM11 18h2', tablet: 'M5 3h14v18H5zM11 17h2',
  logout: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11', globe: 'M12 21a9 9 0 100-18 9 9 0 000 18zM3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18', home: 'M4 11l8-7 8 7v9H4zM10 20v-6h4v6', chat: 'M4 5h16v11H9l-5 4z', lock: 'M6 11h12v9H6zM9 11V8a3 3 0 016 0v3', bolt: 'M13 3L5 14h6l-1 7 8-11h-6z', refresh: 'M20 12a8 8 0 11-2.3-5.7M20 4v5h-5', edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4', send: 'M4 12l16-8-6 16-3-7z', at: 'M16 12a4 4 0 11-8 0 4 4 0 018 0zM16 12v1.5a2.5 2.5 0 005 0V12a9 9 0 10-3.5 7.1', clip: 'M15 7l-6.5 6.5a2 2 0 003 3L18 10a4 4 0 00-6-6l-7 7a6 6 0 008 8l6-6', doc: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h7', users: 'M9 11a3 3 0 100-6 3 3 0 000 6zM3 20a6 6 0 0112 0M17 11a3 3 0 000-6M21 20a6 6 0 00-4-5.6', eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 100-6 3 3 0 000 6z', settings: 'M12 9a3 3 0 100 6 3 3 0 000-6zM4 12h2M18 12h2M12 4v2M12 18v2',
};
export default function Icon({ name, size = 16 }: { name: keyof typeof P | string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={P[name] ?? ''} /></svg>;
}
