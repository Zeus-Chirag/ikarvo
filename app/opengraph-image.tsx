import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    <div style={{ fontFamily: "system-ui" }}>
      <div style={{ padding: 40, height: 100 }}>
        <h1>Ikarvo</h1>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
    },
  );
}
