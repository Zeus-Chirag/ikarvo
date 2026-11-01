import { NextResponse } from "next/server";

import { zfd } from "zod-flexible";

import { RequireAuth } from "~/lib/supabase/admin";
import { routeErrorResponse } from "~/lib/route-error";

const StatsParser = zfd.object({
  campaign_id: zfd.text(),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const campaignId = url.searchParams.get("campaign_id");
  try {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL
      || !process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set",
        },
        { status: 500 },
      );
    }
    const supabaseResponse = await RequireAuth.getServerClient()
      .from("campaigns")
      .select("*")
      .eq("id", campaignId);
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
