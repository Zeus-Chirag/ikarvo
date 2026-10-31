import { ImageResponse } from 'next/og';

export const alt = 'Ikarvo - build the product, then sell it';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const PAPER = '#f4f0e6';
const INK = '#14130f';
const MOON = '#6a5200';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: '100%',
          height: '100%',
          background: PAPER,
          color: INK,
          padding: '72px 80px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: 22, letterSpacing: '0.28em', textTransform: 'uppercase', color: MOON }}>
            Ikarvo
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 84, lineHeight: 1.02, letterSpacing: '-0.02em' }}>Build the product,</span>
          <span style={{ fontSize: 84, lineHeight: 1.02, letterSpacing: '-0.02em', fontStyle: 'italic', color: MOON }}>
            then sell it.
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            borderTop: `2px solid ${INK}`,
            paddingTop: 24,
          }}
        >
          <span style={{ fontSize: 26 }}>Prompt to app. App to ads. One workspace.</span>
          <span style={{ fontSize: 20, letterSpacing: '0.2em', textTransform: 'uppercase', color: MOON }}>
            ikarvo.app
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
