import { NextResponse } from "next/server";

import { callbackUrl, requestOrigin } from "~/lib/env";
import { handleMetaCallback, handleMetaConnect } from "~/lib/meta";

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.pathname.endsWith("/callback")) {
    return handleMetaCallback(req, { callbackUrl, requestOrigin });
  }
  return handleMetaConnect(req, { callbackUrl, requestOrigin });
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  if (url.pathname.endsWith("/callback")) {
    return handleMetaCallback(req, { callbackUrl, requestOrigin });
  }
  return handleMetaConnect(req, { callbackUrl, requestOrigin });
}
