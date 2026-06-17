import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { HoldingForm } from "@/components/holdings/holding-form";

export default function NewHoldingPage() {
  return (
    <div className="px-4 py-6">
      <Link
        href="/holdings"
        className="inline-flex items-center gap-1 text-xs mb-6 transition-colors"
        style={{ color: "var(--muted-foreground)" }}
      >
        <ChevronLeft size={13} />
        持仓库
      </Link>

      <div className="mb-6">
        <h1 className="text-xl font-semibold" style={{ color: "var(--foreground)" }}>新建持仓档案</h1>
        <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
          为这只股票建立逻辑档案，让每一笔持仓都有据可查
        </p>
      </div>

      <div
        className="rounded-xl p-5 border"
        style={{ backgroundColor: "var(--surface-card)", borderColor: "var(--border-subtle)" }}
      >
        <HoldingForm />
      </div>
    </div>
  );
}
