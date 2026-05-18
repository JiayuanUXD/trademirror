"use client";

import { useState } from "react";
import Link from "next/link";
import { AdminUser } from "@/lib/db/queries/admin";
import dayjs from "dayjs";
import { AlertTriangle, Shield, ShieldOff } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type RolePending = {
  type: "role";
  userId: string;
  userName: string;
  currentRole: string;
  newRole: string;
};

type DisablePending = {
  type: "disable";
  userId: string;
  userName: string;
  newDisabled: boolean;
};

type Pending = RolePending | DisablePending;

// ─── Confirmation Modal ───────────────────────────────────────────────────────

function ConfirmModal({
  pending,
  onConfirm,
  onCancel,
  loading,
}: {
  pending: Pending;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const isRoleToAdmin = pending.type === "role" && pending.newRole === "admin";
  const isDisable = pending.type === "disable" && pending.newDisabled;

  const confirmColor = isDisable
    ? "var(--brand-red)"
    : isRoleToAdmin
    ? "#8b5cf6"
    : "var(--brand-blue)";

  const title =
    pending.type === "role"
      ? `修改角色`
      : pending.newDisabled
      ? "禁用账号"
      : "启用账号";

  const description =
    pending.type === "role"
      ? `将「${pending.userName}」的角色从 ${
          pending.currentRole === "admin" ? "管理员（admin）" : "普通用户（user）"
        } 改为 ${pending.newRole === "admin" ? "管理员（admin）" : "普通用户（user）"}？`
      : `${pending.newDisabled ? "禁用" : "启用"}「${pending.userName}」的账号？`;

  const hint =
    isRoleToAdmin
      ? "管理员拥有查看所有用户数据、管理账号权限的能力，请谨慎授权。"
      : isDisable
      ? "禁用后该用户将无法登录，已有数据不会被删除。"
      : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backgroundColor: "rgba(0,0,0,0.65)" }}
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div
        className="w-full max-w-sm rounded-xl p-5 space-y-4"
        style={{
          backgroundColor: "var(--surface-card)",
          border: "1px solid var(--border-subtle)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
        }}
      >
        {/* Header */}
        <div className="flex items-start gap-3">
          <div
            className="flex-shrink-0 mt-0.5 p-2 rounded-lg"
            style={{ backgroundColor: isDisable ? "rgba(239,68,68,0.1)" : "rgba(234,179,8,0.1)" }}
          >
            <AlertTriangle
              size={15}
              style={{ color: isDisable ? "var(--brand-red)" : "var(--brand-warning)" }}
            />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>
              {title}
            </p>
            <p className="text-sm mt-1 leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
              {description}
            </p>
          </div>
        </div>

        {/* Hint */}
        {hint && (
          <p
            className="text-xs px-3 py-2.5 rounded-lg leading-relaxed"
            style={{
              backgroundColor: isDisable ? "rgba(239,68,68,0.07)" : "rgba(139,92,246,0.07)",
              color: "var(--muted-foreground)",
              border: `1px solid ${isDisable ? "rgba(239,68,68,0.15)" : "rgba(139,92,246,0.15)"}`,
            }}
          >
            {hint}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2 justify-end pt-1">
          <button
            onClick={onCancel}
            className="px-4 py-1.5 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
            style={{
              backgroundColor: "var(--surface-overlay)",
              color: "var(--muted-foreground)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-1.5 rounded-lg text-sm font-medium text-white disabled:opacity-50 transition-opacity hover:opacity-90"
            style={{ backgroundColor: confirmColor }}
          >
            {loading ? "处理中…" : "确认"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Role Select ──────────────────────────────────────────────────────────────

function RoleSelect({
  userId,
  userName,
  role,
  isSelf,
  onRequestChange,
}: {
  userId: string;
  userName: string;
  role: string;
  isSelf: boolean;
  onRequestChange: (pending: RolePending) => void;
}) {
  const isAdmin = role === "admin";

  if (isSelf) {
    return (
      <span
        className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded font-medium"
        style={{
          backgroundColor: isAdmin ? "rgba(139,92,246,0.15)" : "rgba(148,163,184,0.12)",
          color: isAdmin ? "#8b5cf6" : "var(--muted-foreground)",
        }}
        title="无法修改自己的角色"
      >
        {isAdmin ? <Shield size={10} /> : null}
        {isAdmin ? "admin" : "user"}
      </span>
    );
  }

  return (
    <button
      onClick={() => {
        const newRole = role === "admin" ? "user" : "admin";
        onRequestChange({ type: "role", userId, userName, currentRole: role, newRole });
      }}
      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded font-medium cursor-pointer transition-all hover:opacity-80 group"
      style={{
        backgroundColor: isAdmin ? "rgba(139,92,246,0.15)" : "rgba(148,163,184,0.12)",
        color: isAdmin ? "#8b5cf6" : "var(--muted-foreground)",
        border: "1px solid transparent",
      }}
      title={`点击切换为 ${isAdmin ? "user" : "admin"}`}
    >
      {isAdmin ? <Shield size={10} /> : <ShieldOff size={10} />}
      {isAdmin ? "admin" : "user"}
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function UserListClient({
  users: initialUsers,
  currentUserId,
}: {
  users: AdminUser[];
  currentUserId: string;
}) {
  const [users, setUsers] = useState(initialUsers);
  const [pending, setPending] = useState<Pending | null>(null);
  const [loading, setLoading] = useState(false);

  async function confirmChange() {
    if (!pending) return;
    setLoading(true);
    try {
      if (pending.type === "role") {
        const res = await fetch(`/api/admin/users/${pending.userId}/role`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: pending.newRole }),
        });
        const data = await res.json();
        if (data.role) {
          setUsers((prev) =>
            prev.map((x) => (x.id === pending.userId ? { ...x, role: data.role } : x))
          );
        }
      } else {
        const res = await fetch(`/api/admin/users/${pending.userId}/disable`, {
          method: "PATCH",
        });
        const data = await res.json();
        if (data.disabled !== undefined) {
          setUsers((prev) =>
            prev.map((x) =>
              x.id === pending.userId ? { ...x, disabled: data.disabled } : x
            )
          );
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setPending(null);
    }
  }

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

      {/* Confirmation Modal */}
      {pending && (
        <ConfirmModal
          pending={pending}
          onConfirm={confirmChange}
          onCancel={() => setPending(null)}
          loading={loading}
        />
      )}

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
            {users.map((u) => {
              const isSelf = u.id === currentUserId;
              return (
                <tr
                  key={u.id}
                  className="border-t"
                  style={{ borderColor: "var(--border-subtle)" }}
                >
                  {/* User info */}
                  <td className="px-3 py-3">
                    <div
                      className="font-medium flex items-center gap-1.5"
                      style={{ color: "var(--foreground)" }}
                    >
                      {u.name || "—"}
                      {isSelf && (
                        <span
                          className="text-[10px] px-1.5 py-0 rounded font-normal"
                          style={{
                            backgroundColor: "rgba(61,142,248,0.12)",
                            color: "var(--brand-blue)",
                          }}
                        >
                          你
                        </span>
                      )}
                    </div>
                    <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                      {u.email}
                    </div>
                  </td>

                  {/* Registration date */}
                  <td
                    className="px-3 py-3 text-xs hidden sm:table-cell"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {u.createdAt ? dayjs(u.createdAt).format("YYYY/MM/DD") : "—"}
                  </td>

                  {/* Role */}
                  <td className="px-3 py-3">
                    <RoleSelect
                      userId={u.id}
                      userName={u.name || u.email}
                      role={u.role}
                      isSelf={isSelf}
                      onRequestChange={setPending}
                    />
                  </td>

                  {/* Decision count */}
                  <td
                    className="px-3 py-3 hidden sm:table-cell"
                    style={{ color: "var(--foreground)" }}
                  >
                    {u.decisionCount}
                  </td>

                  {/* Status */}
                  <td className="px-3 py-3">
                    <button
                      onClick={() =>
                        setPending({
                          type: "disable",
                          userId: u.id,
                          userName: u.name || u.email,
                          newDisabled: !u.disabled,
                        })
                      }
                      disabled={isSelf}
                      className="text-xs px-2 py-0.5 rounded font-medium transition-opacity hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{
                        backgroundColor: u.disabled
                          ? "rgba(239,68,68,0.12)"
                          : "rgba(34,197,94,0.12)",
                        color: u.disabled ? "var(--brand-red)" : "var(--brand-green)",
                      }}
                      title={isSelf ? "无法禁用自己的账号" : undefined}
                    >
                      {u.disabled ? "已禁用" : "正常"}
                    </button>
                  </td>

                  {/* Actions */}
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
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
