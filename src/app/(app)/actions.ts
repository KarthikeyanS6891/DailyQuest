"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  completeTask,
  createTask,
  deleteTask,
  localTimeToUtc,
  todayInTz,
  uncompleteTask,
} from "@/store/memory";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import type { Priority } from "@/lib/points";

const CreateInput = z.object({
  title: z.string().min(1).max(200),
  priority: z.coerce.number().int().min(1).max(3),
  estimatedMinutes: z.coerce.number().int().min(5).max(240),
  time: z.string().optional(),
});

// FormData.get returns `null` for missing keys. Zod's z.string().optional()
// accepts `undefined` but NOT `null`, which was silently failing the whole
// validation. Convert here so callers don't have to think about it.
function asString(fd: FormData, key: string): string | undefined {
  const v = fd.get(key);
  return typeof v === "string" ? v : undefined;
}

export async function addTaskAction(formData: FormData) {
  const { id: userId } = await requireUser();
  const parsed = CreateInput.safeParse({
    title: asString(formData, "title"),
    priority: asString(formData, "priority"),
    estimatedMinutes: asString(formData, "estimatedMinutes"),
    time: asString(formData, "time"),
  });
  if (!parsed.success) {
    // Surface the first issue so the UI can render it and we have a
    // breadcrumb in server logs instead of a silent no-op.
    const first = parsed.error.issues[0];
    const error = first ? `${first.path.join(".")}: ${first.message}` : "Invalid input.";
    console.error("[addTaskAction] validation failed:", error, parsed.error.issues);
    return { ok: false as const, error };
  }
  const { title, priority, estimatedMinutes, time } = parsed.data;
  let scheduledFor: string | null = null;
  if (time && /^\d{2}:\d{2}$/.test(time)) {
    // Interpret HH:MM in the user's own timezone, not the server's.
    // Without this, "09:00" typed in IST would be stored as 09:00 UTC
    // (= 14:30 IST) — the user would see the wrong time displayed back.
    const [u] = await db
      .select({ tz: users.timezone })
      .from(users)
      .where(eq(users.id, userId));
    const tz = u?.tz || "UTC";
    const today = todayInTz(tz);
    scheduledFor = localTimeToUtc(today, time, tz).toISOString();
  }
  try {
    await createTask(userId, {
      title,
      priority: priority as Priority,
      estimatedMinutes,
      scheduledFor,
    });
  } catch (e) {
    console.error("[addTaskAction] createTask failed:", e);
    return { ok: false as const, error: "Could not save the quest. Please try again." };
  }
  revalidatePath("/");
  revalidatePath("/analytics");
  return { ok: true as const };
}

export async function completeTaskAction(taskId: string) {
  const { id: userId } = await requireUser();
  const result = await completeTask(userId, taskId);
  revalidatePath("/");
  revalidatePath("/rewards");
  revalidatePath("/analytics");
  return { ok: Boolean(result), awarded: result?.awarded ?? 0 };
}

export async function uncompleteTaskAction(taskId: string) {
  const { id: userId } = await requireUser();
  await uncompleteTask(userId, taskId);
  revalidatePath("/");
  revalidatePath("/rewards");
  revalidatePath("/analytics");
  return { ok: true };
}

export async function deleteTaskAction(taskId: string) {
  const { id: userId } = await requireUser();
  await deleteTask(userId, taskId);
  revalidatePath("/");
  revalidatePath("/analytics");
  return { ok: true };
}

// Called once per browser visit by <TimezoneSync /> in the (app) layout.
// Updates the stored timezone if it differs so all "is this today?"
// computations use the user's actual local day.
export async function updateTimezoneAction(tz: string) {
  if (!tz || typeof tz !== "string" || tz.length > 64) return { changed: false };
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
  } catch {
    return { changed: false };
  }
  const { id: userId } = await requireUser();
  const [u] = await db
    .select({ timezone: users.timezone })
    .from(users)
    .where(eq(users.id, userId));
  if (u?.timezone === tz) return { changed: false };
  await db.update(users).set({ timezone: tz }).where(eq(users.id, userId));
  revalidatePath("/", "layout");
  return { changed: true };
}
