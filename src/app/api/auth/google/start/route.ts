import { NextResponse, type NextRequest } from "next/server";
import {
  generateCodeVerifier,
  generateState,
  getGoogleClient,
  getRequestOrigin,
  isGoogleConfigured,
} from "@/lib/google-oauth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isGoogleConfigured()) {
    return NextResponse.json(
      { error: "Google OAuth is not configured on this server." },
      { status: 501 },
    );
  }

  const origin = getRequestOrigin(req);
  const google = getGoogleClient(origin);
  const state = generateState();
  const codeVerifier = generateCodeVerifier();

  const url = google.createAuthorizationURL(state, codeVerifier, [
    "openid",
    "email",
    "profile",
  ]);

  const res = NextResponse.redirect(url.toString());
  const tenMinutes = 60 * 10;
  const cookieOpts = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: tenMinutes,
  };
  res.cookies.set("dq_oauth_state", state, cookieOpts);
  res.cookies.set("dq_oauth_verifier", codeVerifier, cookieOpts);
  return res;
}
