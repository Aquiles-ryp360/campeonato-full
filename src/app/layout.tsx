import type { Metadata } from "next";
import { Barlow_Condensed, Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const display = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["700", "800"],
  style: ["normal", "italic"],
  variable: "--font-display"
});

export const metadata: Metadata = {
  title: "Campeonato Carreras",
  description: "Gestion de eventos deportivos por carrera con inscripciones, fixture y arbitraje en vivo.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://campeonato-full.vercel.app"),
  openGraph: {
    title: "Campeonato Carreras",
    description: "Fixture, arbitraje en vivo y resultados oficiales.",
    type: "website"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${inter.className} ${inter.variable} ${display.variable}`}>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
