import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Apuração — Eleições 2026",
  description: "Painel pessoal de apuração: Presidente e cargos do RS.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
