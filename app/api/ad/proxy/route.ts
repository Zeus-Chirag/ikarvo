import { NextResponse } from "next/server";

import { zfd } from "zod-flexible";

import { RequireAuth } from "~/lib/supabase/admin";
import { routeErrorResponse } from "~/lib/route-error";
import { fetchAdProxyUrl } from "~/lib/ad-proxy";

const ProxyParser = zfd.object({
  url: zfd.text(),
  requestType: zfd.text(),
  request: zfd.text(),
});

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
    const user = (await RequireAuth(req)) as z.infer<typeof RequireAuth>;
    if (!user || typeof user !== "object" || !("id" in user) || !user.id) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 },
      );
    }
    const body = await req.json();
    const parsed = ProxyParser.parse(body);
    const url = await fetchAdProxyUrl(parsed.url, parsed.requestType, parsed.request);
    return NextResponse.json({ ok: true, url });
  } catch (error) {
    return routeErrorResponse(error);
  }
}
