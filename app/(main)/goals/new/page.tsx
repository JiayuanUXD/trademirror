import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { GoalWizard } from "@/components/goals/goal-wizard";

export default function NewGoalPage() {
  return (
    <div className="p-6 space-y-5">
      <Link href="/goals"
        className="inline-flex items-center gap-1 text-xs transition-colors"
        style={{ color: "var(--muted-foreground)" }}>
        <ChevronLeft size={13} />
        目标列表
      </Link>
      <div>
        <h1 className="text-xl font-semibold" style={{ color: "var(--foreground)" }}>新建投资目标</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--muted-foreground)" }}>
          系统会评估目标的可实现性，帮你设定合理预期
        </p>
      </div>
      <GoalWizard />
    </div>
  );
}
