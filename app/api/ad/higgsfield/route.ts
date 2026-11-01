import { NextResponse } from "next/server";

import { zfd } from "zod-flexible";

import { RequireAuth } from "~/lib/supabase/admin";
import { routeErrorResponse } from "~/lib/route-error";

const HiggsfieldParser = zfd.object({
  brand_name: zfd.text(),
  brand_domain: zfd.text(),
  title: zfd.text(),
  description: zfd.text(),
  prompt: zfd.text(),
  aspect_ratio: zfd.text(),
  product_name: zfd.text(),
  external_url: zfd.text(),
  long_url: zfd.text(),
  is_featured: zfd.text(),
  output_path: zfd.text(),
  model: zfd.text(),
  image_size: zfd.text(),
  log: zfd.text(),
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
      .from("ad-higgsfield")
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
    const parsed = HiggsfieldParser.parse(body);
    const supabaseResponse = await RequireAuth.getServerClient()
      .from("ad-higgsfield")
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
