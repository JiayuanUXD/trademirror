import { auth } from "@/auth";
import { getSettings } from "@/lib/db/queries/settings";
import { SettingsForm } from "./settings-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const settings = await getSettings(userId);

  return <SettingsForm initialSettings={settings} />;
}
