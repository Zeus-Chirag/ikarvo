import { NextResponse } from "next/server";

import { zfd } from "zod-flexible";

import { RequireAuth } from "~/lib/supabase/admin";
import { routeErrorResponse } from "~/lib/route-error";

const PublishCmsParser = zfd.object({
  target: zfd.text(),
  content: zfd.text(),
});

export async function POST(req: Request) {
  const url = new URL(req.url);
  const target = url.pathname.split("/").pop();
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
    const user = (await RequireAuth(req)) as z.infer<typeof RequireAuth>;
    if (!user || typeof user !== "object" || !("id" in user) || !user.id) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 },
      );
    }
    const body = await req.json();
    const parsed = PublishCmsParser.parse(body);
    // In a real app this would publish to the target CMS.
    return NextResponse.json({ ok: true, published: target });
  } catch (error) {
    return routeErrorResponse(error);
  }
}
