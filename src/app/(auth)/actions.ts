"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/db/client";
import { habits as habitsT, tasks as tasksT, users } from "@/db/schema";
import {
  clearSessionCookie,
  hashPassword,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";
import { localTimeToUtc, todayInTz } from "@/store/memory";
import { isValidEmail, passwordError } from "@/lib/validation";

// Read the dq_tz cookie that AuthForm drops before submission, falling back
// to UTC. Validated against Intl so a bad value can't leak through.
async function readTzHint(): Promise<string> {
  try {
    const c = await cookies();
    const tz = c.get("dq_tz")?.value;
    if (!tz) return "UTC";
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return "UTC";
  }
}

const SignUpInput = z.object({
  email: z
    .string()
    .max(254)
    .transform((v) => v.trim().toLowerCase())
    .refine(isValidEmail, "Enter a valid email address."),
  password: z
    .string()
    .max(128)
    .superRefine((v, ctx) => {
      const err = passwordError(v);
      if (err) ctx.addIssue({ code: z.ZodIssueCode.custom, message: err });
    }),
});

// Sign-in only checks credentials are present and email-shaped — never echo
// password rules back, since we don't know what older accounts looked like.
const SignInInput = z.object({
  email: z
    .string()
    .max(254)
    .transform((v) => v.trim().toLowerCase())
    .refine(isValidEmail, "Enter a valid email address."),
  password: z.string().min(1).max(128),
});

function monthIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

async function seedNewUser(userId: string, tz: string) {
  // Compute scheduled times in the user's local clock — "7am" must mean
  // 07:00 on their phone, not 07:00 UTC (= 12:30 IST).
  const today = todayInTz(tz);
  const at = (h: number, m = 0) =>
    localTimeToUtc(today, `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`, tz);
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

export async function signUpAction(formData: FormData): Promise<{ ok: false; error: string } | void> {
  const parsed = SignUpInput.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { email } = parsed.data;
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) {
    return { ok: false, error: "An account with that email already exists." };
  }
  const passwordHash = await hashPassword(parsed.data.password);
  const userId = nanoid(21);
  const tz = await readTzHint();
  await db.insert(users).values({
    id: userId,
    email,
    passwordHash,
    timezone: tz,
  });
  await seedNewUser(userId, tz);
  await setSessionCookie({ sub: userId, email });
  redirect("/");
}

export async function signInAction(formData: FormData): Promise<{ ok: false; error: string } | void> {
  const parsed = SignInInput.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { email } = parsed.data;
  const [u] = await db
    .select({ id: users.id, email: users.email, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (!u || !u.passwordHash) {
    return { ok: false, error: "Invalid email or password." };
  }
  const ok = await verifyPassword(parsed.data.password, u.passwordHash);
  if (!ok) {
    return { ok: false, error: "Invalid email or password." };
  }
  await setSessionCookie({ sub: u.id, email: u.email });
  redirect("/");
}

export async function signOutAction() {
  await clearSessionCookie();
  redirect("/signin");
}
