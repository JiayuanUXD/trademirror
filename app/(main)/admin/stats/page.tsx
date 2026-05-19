import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getAdminStats } from "@/lib/db/queries/admin";
import { AdminStatsClient } from "./client";

export const dynamic = "force-dynamic";

export default async function AdminStatsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "admin") redirect("/");

  const stats = await getAdminStats();

  return <AdminStatsClient stats={stats} />;
}
