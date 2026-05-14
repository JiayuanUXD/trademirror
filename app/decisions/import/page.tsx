"use client";

import { useState } from "react";
import { Upload, FileUp, AlertCircle, CheckCircle2, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { ImportZone } from "@/components/decisions/import-zone";

export default function ImportPage() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link 
          href="/decisions"
          className="p-2 hover:bg-white/5 rounded-full transition-colors border border-[var(--border-subtle)]"
        >
          <ChevronLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <FileUp className="text-[var(--brand-blue)]" size={20} />
            导入决策数据
          </h1>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            支持通达信、同花顺导出的 CSV 格式对账单或历史成交
          </p>
        </div>
      </div>

      <div className="max-w-3xl">
        <ImportZone />
      </div>

      {/* Guide */}
      <div className="bg-[var(--surface-card)] rounded-2xl border border-[var(--border-subtle)] p-6 space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <AlertCircle size={14} className="text-[var(--brand-warning)]" />
          导入说明
        </h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <h4 className="text-xs font-bold">通达信 (TDX)</h4>
            <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
              打开“成交查询”或“对账单”，点击窗口下方的“导出”按钮，选择 CSV 格式。
            </p>
            <div className="bg-black/20 p-2 rounded text-[10px] font-mono text-[var(--muted-foreground)]">
              成交日期,成交时间,证券代码,证券名称,操作,成交数量,成交均价...
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="text-xs font-bold">同花顺 (THS)</h4>
            <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
              进入“个人对账单”或“历史成交”，右键选择“导出到 CSV/Excel”。
            </p>
            <div className="bg-black/20 p-2 rounded text-[10px] font-mono text-[var(--muted-foreground)]">
              日期,证券代码,证券名称,成交方向,成交数量,成交价格...
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
