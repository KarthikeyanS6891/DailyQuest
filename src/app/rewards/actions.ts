"use server";

import { revalidatePath } from "next/cache";
import { redeemReward } from "@/store/memory";

const userId = process.env.DEV_USER_ID ?? "dev-user";

export async function redeemAction(rewardId: string) {
  const result = redeemReward(userId, rewardId);
  revalidatePath("/rewards");
  revalidatePath("/");
  return result;
}
