import { NextResponse } from "next/server";

import {RequireAuth} from "~/lib/supabase/admin";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.json({ ok: false, error: "missing code" }, { status: 400 });
  }

  // In a real app, exchange the code for a session here.
  const user = { id: "user-demo", email: "demo@example.com" };

  const response = NextResponse.redirect(new URL(next, req.url));
  response.cookies.set("session", JSON.stringify(user), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
