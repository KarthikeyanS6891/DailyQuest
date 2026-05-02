"use server";

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

const Credentials = z.object({
  email: z.string().email().max(120),
  password: z.string().min(8).max(128),
});

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

export async function signUpAction(formData: FormData): Promise<{ ok: false; error: string } | void> {
  const parsed = Credentials.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Email and 8+ char password required." };
  }
  const email = parsed.data.email.trim().toLowerCase();
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) {
    return { ok: false, error: "An account with that email already exists." };
  }
  const passwordHash = await hashPassword(parsed.data.password);
  const userId = nanoid(21);
  await db.insert(users).values({
    id: userId,
    email,
    passwordHash,
    timezone: "UTC",
  });
  await seedNewUser(userId);
  await setSessionCookie({ sub: userId, email });
  redirect("/");
}

export async function signInAction(formData: FormData): Promise<{ ok: false; error: string } | void> {
  const parsed = Credentials.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Enter a valid email and password." };
  }
  const email = parsed.data.email.trim().toLowerCase();
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
