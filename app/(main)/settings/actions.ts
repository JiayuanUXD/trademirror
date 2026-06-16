"use server";

import { auth } from "@/auth";
import { updateSettings, Settings } from "@/lib/db/queries/settings";
import { revalidatePath } from "next/cache";

export async function saveSettingsAction(patch: Partial<Settings>) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Unauthorized");

  await updateSettings(patch, userId);
  revalidatePath("/settings");
  revalidatePath("/");
  revalidatePath("/sentiment");
  revalidatePath("/screener");
}
