"use client";

import { useState, useRef } from "react";
import { Upload, FileText, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function ImportZone() {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "parsing" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function parseCSV(text: string) {
    const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 2) throw new Error("文件内容为空或格式不正确");

    const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
    
    // Simple heuristic to detect broker format
    const isTDX = headers.includes("证券代码") && headers.includes("成交日期");
    const isTHS = headers.includes("证券名称") && headers.includes("成交方向");

    if (!isTDX && !isTHS) {
      throw new Error("无法识别的 CSV 格式，请确保表头包含‘证券代码’和‘成交日期/方向’");
    }

    const data = lines.slice(1).map(line => {
      const values = line.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => {
        obj[h] = values[i];
      });
      return obj;
    });

    return data.map(row => ({
      stockCode: row["证券代码"] || row["代码"] || "",
      stockName: row["证券名称"] || row["名称"] || "",
      action: detectAction(row["操作"] || row["成交方向"] || row["方向"] || ""),
      price: parseFloat(row["成交均价"] || row["成交价格"] || row["价格"] || "0"),
      quantity: Math.abs(parseInt(row["成交数量"] || row["数量"] || "0")),
      createdAt: row["成交日期"] || row["日期"] || "",
    }));
  }

  function detectAction(val: string): "BUY" | "SELL" | "ADD" | "REDUCE" | "CLEAR" {
    if (val.includes("买")) return "BUY";
    if (val.includes("卖")) return "SELL";
    return "BUY";
  }

  const handleFile = async (f: File) => {
    if (!f.name.endsWith(".csv")) {
      setError("仅支持 .csv 文件");
      setStatus("error");
      return;
    }

    setFile(f);
    setStatus("parsing");
    
    try {
      const text = await f.text();
      const results = parseCSV(text);
      
      // For MVP, we just log and show success. In real app, we'd POST to API.
      console.log("Parsed results:", results);
      
      setTimeout(() => {
        setStatus("success");
        // Redirect or show summary
      }, 1500);
    } catch (err: any) {
      setError(err.message || "解析失败");
      setStatus("error");
    }
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
        }}
        onClick={() => inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center gap-4 transition-all cursor-pointer hover:bg-white/[0.02] ${
          dragging ? "border-[var(--brand-blue)] bg-[var(--brand-blue-dim)]" : "border-[var(--border-strong)]"
        }`}
      >
        <input
          type="file"
          ref={inputRef}
          className="hidden"
          accept=".csv"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />

        {status === "idle" && (
          <>
            <div className="p-4 rounded-full bg-[var(--brand-blue-dim)] text-[var(--brand-blue)]">
              <Upload size={32} />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold">点击或拖拽 CSV 文件到此处</p>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">支持通达信、同花顺标准导出格式</p>
            </div>
          </>
        )}

        {status === "parsing" && (
          <>
            <Loader2 size={32} className="animate-spin text-[var(--brand-blue)]" />
            <p className="text-sm font-medium">正在解析数据...</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle2 size={32} className="text-[var(--brand-green)]" />
            <div className="text-center">
              <p className="text-sm font-semibold">解析成功！</p>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">共识别到有效交易记录，正在准备导入表单...</p>
            </div>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle size={32} className="text-[var(--brand-red)]" />
            <div className="text-center">
              <p className="text-sm font-semibold text-[var(--brand-red)]">导入失败</p>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">{error}</p>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); setStatus("idle"); }}
              className="text-xs text-[var(--brand-blue)] hover:underline"
            >
              重试
            </button>
          </>
        )}
      </div>

      {status === "success" && (
        <div className="flex justify-end gap-3">
          <button 
            onClick={() => setStatus("idle")}
            className="px-4 py-2 rounded-lg text-xs border border-[var(--border-subtle)] hover:bg-white/5"
          >
            取消
          </button>
          <button 
            className="px-4 py-2 rounded-lg text-xs bg-[var(--brand-blue)] text-white font-medium"
          >
            确认并生成决策卡
          </button>
        </div>
      )}
    </div>
  );
}
