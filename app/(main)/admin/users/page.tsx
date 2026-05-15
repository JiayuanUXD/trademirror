import { auth } from "@/auth";
import { getAllUsers } from "@/lib/db/queries/admin";
import { UserListClient } from "./client";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") return null;

  const users = await getAllUsers();

  return <UserListClient users={users} />;
}
