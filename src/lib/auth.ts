import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema";

const COOKIE = "dq_session";
const SESSION_DAYS = 30;

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) {
    throw new Error("AUTH_SECRET must be set to a 32+ char random string in .env.local");
  }
  return new TextEncoder().encode(s);
}

export type SessionPayload = { sub: string; email: string };

export async function signSession(payload: SessionPayload): Promise<string> {
  return await new SignJWT({ email: payload.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    if (!payload.sub || typeof payload.email !== "string") return null;
    return { sub: payload.sub, email: payload.email };
  } catch {
    return null;
  }
}

export async function setSessionCookie(payload: SessionPayload): Promise<void> {
  const token = await signSession(payload);
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  return await verifySession(token);
}

export async function getCurrentUser(): Promise<{ id: string; email: string } | null> {
  const session = await getSession();
  if (!session) return null;
  const [u] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.id, session.sub))
    .limit(1);
  return u ?? null;
}

export async function requireUser(): Promise<{ id: string; email: string }> {
  const u = await getCurrentUser();
  if (!u) {
    // JWT may verify but the user row could be missing (deleted/wiped).
    // Clear the stale cookie so middleware doesn't bounce us back here.
    await clearSessionCookie();
    redirect("/signin");
  }
  return u;
}

export const SESSION_COOKIE_NAME = COOKIE;

// Password helpers — kept in this file so callers don't import bcrypt directly.
// (Edge-runtime callers should NOT use these; bcryptjs is node-only.)
export async function hashPassword(password: string): Promise<string> {
  const bcrypt = (await import("bcryptjs")).default;
  return await bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const bcrypt = (await import("bcryptjs")).default;
  return await bcrypt.compare(password, hash);
}
