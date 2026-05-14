"use server";

import { updateSettings, Settings } from "@/lib/db/queries/settings";
import { revalidatePath } from "next/cache";

export async function saveSettingsAction(patch: Partial<Settings>) {
  await updateSettings(patch);
  revalidatePath("/settings");
  revalidatePath("/");
}
