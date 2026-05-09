"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  completeTask,
  createTask,
  deleteTask,
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

export async function addTaskAction(formData: FormData) {
  const { id: userId } = await requireUser();
  const parsed = CreateInput.safeParse({
    title: formData.get("title"),
    priority: formData.get("priority"),
    estimatedMinutes: formData.get("estimatedMinutes"),
    time: formData.get("time"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.message };
  const { title, priority, estimatedMinutes, time } = parsed.data;
  let scheduledFor: string | null = null;
  if (time && /^\d{2}:\d{2}$/.test(time)) {
    const [h, m] = time.split(":").map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    scheduledFor = d.toISOString();
  }
  await createTask(userId, {
    title,
    priority: priority as Priority,
    estimatedMinutes,
    scheduledFor,
  });
  revalidatePath("/");
  revalidatePath("/analytics");
  return { ok: true };
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
