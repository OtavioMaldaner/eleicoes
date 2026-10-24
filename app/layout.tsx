import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import { Cabecalho } from "@/components/Cabecalho";
import "./globals.css";

const dominio = process.env.VERCEL_PROJECT_PRODUCTION_URL;

export const metadata: Metadata = {
  metadataBase: new URL(dominio ? `https://${dominio}` : "http://localhost:3000"),
  title: "Apuração — Eleições 2026",
  description: "Apuração ao vivo das eleições 2026: presidente (2º turno), governadores, senado e deputados, com mapas por estado, cidade e exterior.",
  openGraph: { type: "website", locale: "pt_BR", siteName: "Eleições 2026" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full font-sans">
        <Cabecalho />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
