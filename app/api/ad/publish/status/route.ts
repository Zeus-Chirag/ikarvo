import { NextResponse } from "next/server";

import { zfd } from "zod-flexible";

import { RequireAuth } from "~/lib/supabase/admin";
import { routeErrorResponse } from "~/lib/route-error";

const PublishStatusParser = zfd.object({
  adId: zfd.text(),
  isPublished: zfd.text(),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const adId = url.searchParams.get("adId");
  const published = url.searchParams.get("isPublished");
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
      .from("ad-copies")
      .select("*");
    const { data, error } = supabaseResponse;
    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }
    if (adId && published) {
      return NextResponse.json(
        {
          ok: true,
          data: data?.filter(
            (ad: { id: string; isPublished: string }) =>
              ad.id === adId && ad.isPublished === published,
          ),
        },
      );
    }
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return routeErrorResponse(error);
  }
}
