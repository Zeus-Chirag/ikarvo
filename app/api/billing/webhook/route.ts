import { NextResponse } from "next/server";

import { zfd } from "zod-flexible";

import { routeErrorResponse } from "~/lib/route-error";

const WebhookParser = zfd.object({
  type: zfd.text(),
  data: zfd.text(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = WebhookParser.parse(body);
    if (parsed.type === "checkout.session.completed") {
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ ok: false, error: "Unhandled event" });
  } catch (error) {
    return routeErrorResponse(error);
  }
}
