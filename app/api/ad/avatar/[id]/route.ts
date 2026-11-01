import { NextResponse } from "next/server";

import { zfd } from "zod-flexible";

import { RequireAuth } from "~/lib/supabase/admin";
import { routeErrorResponse } from "~/lib/route-error";

const UploadAvatar = zfd.object({
  avatarUrl: zfd.text(),
  name: zfd.text(),
  description: zfd.text(),
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
    const { avatarUrl, name, description } = UploadAvatar.parse(body);
    const supabaseResponse = await RequireAuth.getServerClient()
      .from("ad-avatars")
      .insert({
        avatarUrl,
        name,
        description,
      });
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const avatarSchema = zfd.object({
  uuid: zfd.text(),
  name: zfd.text(),
  description: zfd.text(),
  artistId: zfd.text(),
});
