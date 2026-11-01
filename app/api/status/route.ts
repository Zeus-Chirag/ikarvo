import { NextResponse } from "next/server";

import { zfd } from "zod-flexible";

import { routeErrorResponse } from "~/lib/route-error";

export async function GET() {
  try {
    return NextResponse.json({
      ok: true,
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return routeErrorResponse(error);
  }
}
