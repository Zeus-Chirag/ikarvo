import { NextResponse } from "next/server";

import { callbackUrl, requestOrigin } from "~/lib/env";
import { handleGoogleCallback, handleGoogleConnect } from "~/lib/google";

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.pathname.endsWith("/callback")) {
    return handleGoogleCallback(req, { callbackUrl, requestOrigin });
  }
  return handleGoogleConnect(req, { callbackUrl, requestOrigin });
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  if (url.pathname.endsWith("/callback")) {
    return handleGoogleCallback(req, { callbackUrl, requestOrigin });
  }
  return handleGoogleConnect(req, { callbackUrl, requestOrigin });
}
