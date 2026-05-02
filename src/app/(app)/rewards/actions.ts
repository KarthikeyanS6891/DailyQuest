"use server";

import { revalidatePath } from "next/cache";
import { redeemReward } from "@/store/memory";
import { requireUser } from "@/lib/auth";

export async function redeemAction(rewardId: string) {
  const { id: userId } = await requireUser();
  const result = await redeemReward(userId, rewardId);
  revalidatePath("/rewards");
  revalidatePath("/");
  revalidatePath("/profile");
  return result;
}
