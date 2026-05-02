import { Google, generateState, generateCodeVerifier } from "arctic";

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

// Resolve the redirect URI from a request origin so the same code works on
// localhost and on Railway without a separate env var. The exact value
// returned here MUST be registered as an Authorized redirect URI in the
// Google Cloud Console OAuth client settings.
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
