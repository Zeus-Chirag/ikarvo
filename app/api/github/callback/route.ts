import { NextResponse } from "next/server";

import { callbackUrl, requestOrigin } from "~/lib/env";
import { handleGitHubCallback, handleGitHubConnect } from "~/lib/github";

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.pathname.endsWith("/callback")) {
    return handleGitHubCallback(req, { callbackUrl, requestOrigin });
  }
  return handleGitHubConnect(req, { callbackUrl, requestOrigin });
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  if (url.pathname.endsWith("/callback")) {
    return handleGitHubCallback(req, { callbackUrl, requestOrigin });
  }
  return handleGitHubConnect(req, { callbackUrl, requestOrigin });
}
