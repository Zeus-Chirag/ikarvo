import { NextResponse } from "next/server";

import { zfd } from "zod-flexible";

import { RequireAuth } from "~/lib/supabase/admin";
import { routeErrorResponse } from "~/lib/route-error";

const AccountDeletionParser = zfd.object({
  accountId: zfd.text(),
});

export async function DELETE(req: Request) {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json(
        { ok: false, error: "NEXT_PUBLIC_SUPABASE_URL is not set" },
        { status: 500 },
      );
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is not set" },
        { status: 500 },
      );
    }
    const user = (await RequireAuth(req)) as z.infer<typeof RequireAuth>;
    if (
      !user
      || typeof user !== "object"
      || !("id" in user)
      || !user.id
    ) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 },
      );
    }
    const { id } = AccountDeletionParser.parse({ id: req.body });
    const { session, user: su } = await verifyAccountOwnership(
      req,
      user.id,
      id,
    );
    if (!session || !su) {
      return NextResponse.json(
        { ok: false, error: "Account not found" },
        { status: 404 },
      );
    }
    const supabaseAdmin = RequireAuth.getServerClient();
    const { error } = await supabaseAdmin
      .from("accounts-selections")
      .delete()
      .eq("accountId", id);
    if (error) {
      console.error("Error deleting account selections:", error);
      return NextResponse.json(
        { ok: false, error: "Failed to delete account selections" },
        { status: 500 },
      );
    }
    const { error: error2 } = await supabaseAdmin
      .from("accounts")
      .delete()
      .eq("id", id);
    if (error2) {
      console.error("Error deleting account:", error2);
      return NextResponse.json(
        { ok: false, error: "Failed to delete account" },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return routeErrorResponse(error);
  }
}
