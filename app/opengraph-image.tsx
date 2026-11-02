import { ImageResponse } from 'next/og';
export const alt = 'Ikarvo: build the product, then sell it';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export default function OG() {
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 80, background: '#0d0d0f', color: '#f4f1ea' }}>
      <div style={{ fontSize: 96, fontWeight: 700 }}>Ikarvo</div>
      <div style={{ fontSize: 44, marginTop: 20, opacity: 0.85 }}>Build the product, then sell it.</div>
    </div>, size);
}
