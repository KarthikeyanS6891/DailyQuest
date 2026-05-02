"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createHabit,
  deleteHabit,
  freezeHabit,
  toggleHabitToday,
} from "@/store/memory";
import { requireUser } from "@/lib/auth";

const HabitInput = z.object({
  title: z.string().min(1).max(120),
  cadence: z.enum(["daily", "weekdays", "weekends", "mwf", "tts"]),
});

const CADENCES: Record<string, { type: "daily" } | { type: "weekly"; days: number[] }> = {
  daily: { type: "daily" },
  weekdays: { type: "weekly", days: [1, 2, 3, 4, 5] },
  weekends: { type: "weekly", days: [0, 6] },
  mwf: { type: "weekly", days: [1, 3, 5] },
  tts: { type: "weekly", days: [2, 4, 6] },
};

export async function addHabitAction(formData: FormData) {
  const { id: userId } = await requireUser();
  const parsed = HabitInput.safeParse({
    title: formData.get("title"),
    cadence: formData.get("cadence"),
  });
  if (!parsed.success) return { ok: false };
  await createHabit(userId, { title: parsed.data.title, cadence: CADENCES[parsed.data.cadence] });
  revalidatePath("/habits");
  revalidatePath("/");
  return { ok: true };
}

export async function toggleHabitAction(habitId: string) {
  const { id: userId } = await requireUser();
  const result = await toggleHabitToday(userId, habitId);
  revalidatePath("/habits");
  revalidatePath("/");
  revalidatePath("/rewards");
  revalidatePath("/analytics");
  return { ok: Boolean(result), awarded: result?.awarded ?? 0 };
}

export async function deleteHabitAction(habitId: string) {
  const { id: userId } = await requireUser();
  await deleteHabit(userId, habitId);
  revalidatePath("/habits");
  return { ok: true };
}

export async function freezeHabitAction(habitId: string) {
  const { id: userId } = await requireUser();
  const result = await freezeHabit(userId, habitId);
  revalidatePath("/habits");
  return result;
}
