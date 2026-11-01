import { NextResponse } from "next/server";

import { zfd } from "zod-flexible";

import { RequireAuth } from "~/lib/supabase/admin";
import { routeErrorResponse } from "~/lib/route-error";

const MusicParser = zfd.object({
  artist: zfd.text(),
  track: zfd.text(),
  album: zfd.text(),
  duration: zfd.text(),
  genre: zfd.text(),
  mood: zfd.text(),
});

export async function GET() {
  try {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL
      || !process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      return NextResponse.json(
        { ok: false, error: "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set" },
        { status: 500 },
      );
    }
    const supabaseResponse = await RequireAuth.getServerClient()
      .from("ad-music")
      .select("*");
    const { data, error } = supabaseResponse;
    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return routeErrorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL
      || !process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      return NextResponse.json(
        { ok: false, error: "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set" },
        { status: 500 },
      );
    }
    const body = await req.json();
    const parsed = MusicParser.parse(body);
    const supabaseResponse = await RequireAuth.getServerClient()
      .from("ad-music")
      .insert(parsed);
    const { data, error } = supabaseResponse;
    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return routeErrorResponse(error);
  }
}
