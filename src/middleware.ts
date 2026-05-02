import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC = new Set(["/signin", "/signup"]);
const COOKIE = "dq_session";

function getSecret(): Uint8Array | null {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) return null;
  return new TextEncoder().encode(s);
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const isPublic = PUBLIC.has(pathname);
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
  if (authed && isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js)).*)",
  ],
};
