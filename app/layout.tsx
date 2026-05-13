import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/shared/sidebar";
import { Navbar } from "@/components/shared/navbar";

export const metadata: Metadata = {
  title: "TradeMirror · 你的交易之镜",
  description: "不帮你预测市场，帮你看清自己的交易模式",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="h-full flex flex-col" style={{ backgroundColor: "var(--surface-base)" }}>
        <Navbar />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </body>
    </html>
  );
}
