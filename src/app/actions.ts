"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  completeTask,
  createTask,
  deleteTask,
  uncompleteTask,
} from "@/store/memory";
import type { Priority } from "@/lib/points";

const userId = process.env.DEV_USER_ID ?? "dev-user";

const CreateInput = z.object({
  title: z.string().min(1).max(200),
  priority: z.coerce.number().int().min(1).max(3),
  estimatedMinutes: z.coerce.number().int().min(5).max(240),
  time: z.string().optional(),
});

export async function addTaskAction(formData: FormData) {
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
  createTask(userId, {
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
  const result = completeTask(userId, taskId);
  revalidatePath("/");
  revalidatePath("/rewards");
  revalidatePath("/analytics");
  return { ok: Boolean(result), awarded: result?.awarded ?? 0 };
}

export async function uncompleteTaskAction(taskId: string) {
  uncompleteTask(userId, taskId);
  revalidatePath("/");
  revalidatePath("/rewards");
  revalidatePath("/analytics");
  return { ok: true };
}

export async function deleteTaskAction(taskId: string) {
  deleteTask(userId, taskId);
  revalidatePath("/");
  revalidatePath("/analytics");
  return { ok: true };
}
