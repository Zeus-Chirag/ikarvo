import { NextResponse } from "next/server";

import { zfd } from "zod-flexible";

import { routeErrorResponse } from "~/lib/route-error";

const PlansParser = zfd.object({
  name: zfd.text(),
  price: zfd.text(),
});

export async function GET() {
  try {
    const plans = [
      { name: "free", price: "0" },
      { name: "pro", price: "20" },
      { name: "team", price: "50" },
    ];
    return NextResponse.json({ ok: true, data: plans });
  } catch (error) {
    return routeErrorResponse(error);
  }
}
