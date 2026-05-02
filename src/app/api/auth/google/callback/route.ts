import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/db/client";
import { habits as habitsT, tasks as tasksT, users } from "@/db/schema";
import { setSessionCookie } from "@/lib/auth";
import {
  fetchGoogleProfile,
  getGoogleClient,
  isGoogleConfigured,
} from "@/lib/google-oauth";

export const dynamic = "force-dynamic";

function monthIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

async function seedNewUser(userId: string) {
  const now = new Date();
  const at = (h: number, m = 0) => {
    const d = new Date(now);
    d.setHours(h, m, 0, 0);
    return d;
  };
  await db.insert(tasksT).values([
    { userId, title: "Deep work — draft project brief", priority: 1, estimatedMinutes: 90, scheduledFor: at(9, 0) },
    { userId, title: "Workout (45m)", priority: 1, estimatedMinutes: 45, scheduledFor: at(7, 0) },
    { userId, title: "Inbox zero", priority: 2, estimatedMinutes: 20, scheduledFor: at(11, 30) },
    { userId, title: "Read 20 pages", priority: 2, estimatedMinutes: 25, scheduledFor: at(20, 0) },
    { userId, title: "Plan tomorrow", priority: 3, estimatedMinutes: 10, scheduledFor: at(21, 30) },
  ]);
  await db.insert(habitsT).values([
    { userId, title: "Meditate 10 min", cadence: { type: "daily" }, freezesResetMonth: monthIso() },
    { userId, title: "No phone after 10pm", cadence: { type: "daily" }, freezesResetMonth: monthIso() },
    { userId, title: "Run", cadence: { type: "weekly", days: [1, 3, 5] }, freezesResetMonth: monthIso() },
  ]);
}

function fail(req: NextRequest, reason: string) {
  const url = req.nextUrl.clone();
  url.pathname = "/signin";
  url.search = `?error=${encodeURIComponent(reason)}`;
  const res = NextResponse.redirect(url);
  res.cookies.delete("dq_oauth_state");
  res.cookies.delete("dq_oauth_verifier");
  return res;
}

export async function GET(req: NextRequest) {
  if (!isGoogleConfigured()) return fail(req, "Google sign-in is not configured.");

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const oauthError = req.nextUrl.searchParams.get("error");
  if (oauthError) return fail(req, oauthError);
  if (!code || !state) return fail(req, "Missing code or state.");

  const stateCookie = req.cookies.get("dq_oauth_state")?.value;
  const verifierCookie = req.cookies.get("dq_oauth_verifier")?.value;
  if (!stateCookie || !verifierCookie) return fail(req, "Session expired, try again.");
  if (state !== stateCookie) return fail(req, "Invalid state.");

  let accessToken: string;
  try {
    const tokens = await getGoogleClient(req.nextUrl.origin).validateAuthorizationCode(
      code,
      verifierCookie,
    );
    accessToken = tokens.accessToken();
  } catch {
    return fail(req, "Could not exchange Google authorization code.");
  }

  let profile;
  try {
    profile = await fetchGoogleProfile(accessToken);
  } catch {
    return fail(req, "Could not load your Google profile.");
  }
  if (!profile.email_verified) {
    return fail(req, "Your Google email is not verified.");
  }

  const email = profile.email.trim().toLowerCase();

  // Look up by googleId first, then by email (link existing email account
  // to Google so users don't end up with duplicate accounts).
  const [byGoogle] = await db
    .select()
    .from(users)
    .where(eq(users.googleId, profile.sub))
    .limit(1);

  let userId: string;
  let userEmail: string;

  if (byGoogle) {
    userId = byGoogle.id;
    userEmail = byGoogle.email;
    await db
      .update(users)
      .set({
        name: profile.name ?? byGoogle.name,
        avatarUrl: profile.picture ?? byGoogle.avatarUrl,
      })
      .where(eq(users.id, byGoogle.id));
  } else {
    const [byEmail] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (byEmail) {
      userId = byEmail.id;
      userEmail = byEmail.email;
      await db
        .update(users)
        .set({
          googleId: profile.sub,
          name: byEmail.name ?? profile.name,
          avatarUrl: byEmail.avatarUrl ?? profile.picture,
        })
        .where(eq(users.id, byEmail.id));
    } else {
      userId = nanoid(21);
      userEmail = email;
      await db.insert(users).values({
        id: userId,
        email,
        googleId: profile.sub,
        name: profile.name,
        avatarUrl: profile.picture,
        timezone: "UTC",
      });
      await seedNewUser(userId);
    }
  }

  await setSessionCookie({ sub: userId, email: userEmail });

  const url = req.nextUrl.clone();
  url.pathname = "/";
  url.search = "";
  const res = NextResponse.redirect(url);
  res.cookies.delete("dq_oauth_state");
  res.cookies.delete("dq_oauth_verifier");
  return res;
}
