import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC = new Set(["/signin", "/signup"]);
const PUBLIC_PREFIXES = ["/api/auth/"];
const COOKIE = "dq_session";

function getSecret(): Uint8Array | null {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) return null;
  return new TextEncoder().encode(s);
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const isPublic =
    PUBLIC.has(pathname) || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
  const token = req.cookies.get(COOKIE)?.value;

  let authed = false;
  const secret = getSecret();
  if (token && secret) {
    try {
      await jwtVerify(token, secret, { algorithms: ["HS256"] });
      authed = true;
    } catch {
      authed = false;
    }
  }

  if (!authed && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/signin";
    url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  // Note: we deliberately do NOT bounce authed users away from /signin and
  // /signup here. The JWT may verify but the user row could be missing
  // (e.g. wiped during dev) — bouncing would create a redirect loop. The
  // signin/signup pages do a DB-backed check and redirect themselves when
  // the user genuinely exists.
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip middleware on Next.js internals, static assets, and the
    // metadata routes Next auto-serves (icon, apple-icon, opengraph-image,
    // sitemap, robots, manifest). Browsers fetch /icon without our auth
    // cookie, so middleware must let it through or favicons 307 to /signin.
    "/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|manifest\\.webmanifest|icon|apple-icon|opengraph-image|twitter-image|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js)).*)",
  ],
};
