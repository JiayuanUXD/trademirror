import Link from "next/link";
import { Plus } from "lucide-react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDecisions } from "@/lib/db/queries/decisions";
import { DecisionsList } from "@/components/decisions/decisions-list";

export const dynamic = "force-dynamic";

export default async function DecisionsPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");

  const decisions = await getDecisions(userId, { status: "ALL", limit: 100 });

  return (
    <div className="px-4 py-5 sm:px-6 sm:py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>决策卡</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted-foreground)" }}>
            {decisions.length > 0 ? `共 ${decisions.length} 笔记录` : "在下单前记录你的思考"}
          </p>
        </div>
        <Link
          href="/decisions/new"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: "var(--brand-blue)" }}
        >
          <Plus size={14} />
          新建决策卡
        </Link>
      </div>

      <DecisionsList decisions={decisions} />
    </div>
  );
}
