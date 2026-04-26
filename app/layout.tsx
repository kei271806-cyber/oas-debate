import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OAS Program — 事業開発AIチーム軍議",
  description: "Opti-Agent Synergy 事業開発チームによる協調型マルチエージェント議論システム",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
