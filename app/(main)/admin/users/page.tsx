import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getAllUsers } from "@/lib/db/queries/admin";
import { UserListClient } from "./client";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "admin") redirect("/");

  const users = await getAllUsers();

  return <UserListClient users={users} currentUserId={session.user.id} />;
}
