"use client";

import { useState } from "react";
import Link from "next/link";
import { AdminUser } from "@/lib/db/queries/admin";
import dayjs from "dayjs";

function toggleRole(userId: string, currentRole: string, onUpdate: (role: string) => void) {
  fetch(`/api/admin/users/${userId}/role`, { method: "PATCH" })
    .then((r) => r.json())
    .then((data) => onUpdate(data.role))
    .catch(console.error);
}

function toggleDisabled(
  userId: string,
  currentDisabled: boolean,
  onUpdate: (disabled: boolean) => void
) {
  fetch(`/api/admin/users/${userId}/disable`, { method: "PATCH" })
    .then((r) => r.json())
    .then((data) => onUpdate(data.disabled))
    .catch(console.error);
}

export function UserListClient({ users: initialUsers }: { users: AdminUser[] }) {
  const [users, setUsers] = useState(initialUsers);

  return (
    <div className="px-4 py-5 sm:px-6 sm:py-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
          用户管理
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--muted-foreground)" }}>
          共 {users.length} 位注册用户
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr
              className="text-left text-xs uppercase tracking-wider"
              style={{ color: "var(--muted-foreground)" }}
            >
              <th className="px-3 py-2 font-medium">用户</th>
              <th className="px-3 py-2 font-medium hidden sm:table-cell">注册时间</th>
              <th className="px-3 py-2 font-medium">角色</th>
              <th className="px-3 py-2 font-medium hidden sm:table-cell">决策数</th>
              <th className="px-3 py-2 font-medium">状态</th>
              <th className="px-3 py-2 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr
                key={u.id}
                className="border-t"
                style={{ borderColor: "var(--border-subtle)" }}
              >
                <td className="px-3 py-3">
                  <div className="font-medium" style={{ color: "var(--foreground)" }}>
                    {u.name || "—"}
                  </div>
                  <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                    {u.email}
                  </div>
                </td>
                <td
                  className="px-3 py-3 hidden sm:table-cell"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {u.createdAt ? dayjs(u.createdAt).format("YYYY/MM/DD") : "—"}
                </td>
                <td className="px-3 py-3">
                  <button
                    onClick={() =>
                      toggleRole(u.id, u.role, (newRole) =>
                        setUsers((prev) =>
                          prev.map((x) => (x.id === u.id ? { ...x, role: newRole } : x))
                        )
                      )
                    }
                    className="text-xs px-2 py-0.5 rounded font-medium cursor-pointer transition-opacity hover:opacity-80"
                    style={{
                      backgroundColor:
                        u.role === "admin" ? "rgba(139,92,246,0.15)" : "rgba(148,163,184,0.12)",
                      color: u.role === "admin" ? "var(--brand-purple)" : "var(--muted-foreground)",
                    }}
                  >
                    {u.role === "admin" ? "admin" : "user"}
                  </button>
                </td>
                <td
                  className="px-3 py-3 hidden sm:table-cell"
                  style={{ color: "var(--foreground)" }}
                >
                  {u.decisionCount}
                </td>
                <td className="px-3 py-3">
                  <button
                    onClick={() =>
                      toggleDisabled(u.id, u.disabled, (newDisabled) =>
                        setUsers((prev) =>
                          prev.map((x) =>
                            x.id === u.id ? { ...x, disabled: newDisabled } : x
                          )
                        )
                      )
                    }
                    className="text-xs px-2 py-0.5 rounded font-medium cursor-pointer transition-opacity hover:opacity-80"
                    style={{
                      backgroundColor: u.disabled
                        ? "rgba(239,68,68,0.12)"
                        : "rgba(34,197,94,0.12)",
                      color: u.disabled ? "var(--brand-red)" : "var(--brand-green)",
                    }}
                  >
                    {u.disabled ? "已禁用" : "正常"}
                  </button>
                </td>
                <td className="px-3 py-3">
                  <Link
                    href={`/admin/users/${u.id}`}
                    className="text-xs font-medium transition-opacity hover:opacity-80"
                    style={{ color: "var(--brand-blue)" }}
                  >
                    查看数据
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
