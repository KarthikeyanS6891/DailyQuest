import { Google, generateState, generateCodeVerifier } from "arctic";
import type { NextRequest } from "next/server";

export type GoogleProfile = {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
};

export function isGoogleConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
  );
}

// Build the public-facing origin for a request. Behind a proxy (Railway,
// Vercel, Render), `req.nextUrl.origin` reflects the internal listening
// address (e.g. http://localhost:8080), not what the user sees in the
// browser. We prefer, in order:
//   1. APP_URL env var (explicit override — most reliable)
//   2. RAILWAY_PUBLIC_DOMAIN (set automatically on Railway)
//   3. X-Forwarded-Host + X-Forwarded-Proto headers (standard proxy hints)
//   4. Host header
//   5. req.nextUrl.origin (local dev fallback)
export function getRequestOrigin(req: NextRequest): string {
  const explicit = process.env.APP_URL?.replace(/\/$/, "");
  if (explicit) return explicit;
  const railway = process.env.RAILWAY_PUBLIC_DOMAIN;
  if (railway) return `https://${railway}`;
  const fwdHost = req.headers.get("x-forwarded-host");
  const fwdProto = req.headers.get("x-forwarded-proto")?.split(",")[0].trim();
  if (fwdHost) {
    return `${fwdProto || "https"}://${fwdHost}`;
  }
  const host = req.headers.get("host");
  if (host) {
    const proto = host.startsWith("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : "https";
    return `${proto}://${host}`;
  }
  return req.nextUrl.origin;
}

// The exact value returned here MUST match a redirect URI registered on
// the Google Cloud Console OAuth client.
export function googleRedirectUri(origin: string): string {
  return `${origin.replace(/\/$/, "")}/api/auth/google/callback`;
}

export function getGoogleClient(origin: string): Google {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth env vars are not set.");
  }
  return new Google(clientId, clientSecret, googleRedirectUri(origin));
}

export { generateState, generateCodeVerifier };

export const GOOGLE_USERINFO_URL =
  "https://openidconnect.googleapis.com/v1/userinfo";

export async function fetchGoogleProfile(accessToken: string): Promise<GoogleProfile> {
  const res = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Google userinfo fetch failed: ${res.status}`);
  }
  const data = (await res.json()) as GoogleProfile;
  if (!data.email) throw new Error("Google profile is missing email.");
  return data;
}
