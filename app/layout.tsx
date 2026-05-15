import type { Metadata } from "next";
import "./globals.css";

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
      <body className="h-full" style={{ backgroundColor: "var(--surface-base)" }}>
        {children}
      </body>
    </html>
  );
}
