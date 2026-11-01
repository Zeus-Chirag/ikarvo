import { NextResponse } from "next/server";

import { callbackUrl, requestOrigin } from "~/lib/env";
import { handleVercelCallback, handleVercelConnect } from "~/lib/vercel";

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.pathname.endsWith("/callback")) {
    return handleVercelCallback(req, { callbackUrl, requestOrigin });
  }
  return handleVercelConnect(req, { callbackUrl, requestOrigin });
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  if (url.pathname.endsWith("/callback")) {
    return handleVercelCallback(req, { callbackUrl, requestOrigin });
  }
  return handleVercelConnect(req, { callbackUrl, requestOrigin });
}
