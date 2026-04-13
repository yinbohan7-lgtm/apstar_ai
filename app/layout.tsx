import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "APSTAR 亚太卫星 · 航天科普日",
  description: "上传照片，体验 AI 宇航员变身！亚太卫星航天科普日互动体验。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
