"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { resetUser, updateSettings } from "@/store/memory";
import { clearSessionCookie, requireUser } from "@/lib/auth";

const SettingsInput = z.object({
  timezone: z.string().min(1).max(64).optional(),
  quietHoursStart: z.coerce.number().int().min(0).max(23).optional(),
  quietHoursEnd: z.coerce.number().int().min(0).max(23).optional(),
  notifications: z.coerce.boolean().optional(),
});

export async function updateSettingsAction(formData: FormData) {
  const { id: userId } = await requireUser();
  const parsed = SettingsInput.safeParse({
    timezone: formData.get("timezone") || undefined,
    quietHoursStart: formData.get("quietHoursStart") || undefined,
    quietHoursEnd: formData.get("quietHoursEnd") || undefined,
    notifications: formData.get("notifications") === "on",
  });
  if (!parsed.success) return { ok: false };
  await updateSettings(userId, parsed.data);
  revalidatePath("/profile");
  return { ok: true };
}

export async function resetUserAction() {
  const { id: userId } = await requireUser();
  await resetUser(userId);
  revalidatePath("/");
  revalidatePath("/habits");
  revalidatePath("/rewards");
  revalidatePath("/analytics");
  revalidatePath("/profile");
  return { ok: true };
}

export async function signOutAction() {
  await clearSessionCookie();
  redirect("/signin");
}
