import type { Metadata, Viewport } from "next";
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
  title: "Inscripciones · Campeonato de Futsal y Vóley",
  description:
    "Inscribe a tu equipo: solicita tu código de acceso por WhatsApp, realiza el pago y completa el registro.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://campeonato-full.vercel.app"),
  applicationName: "Campeonato UNA Puno",
  appleWebApp: { capable: true, title: "Campeonato", statusBarStyle: "black-translucent" },
  icons: { apple: "/apple-touch-icon.png" },
  openGraph: {
    title: "Inscribe a tu equipo · Campeonato de Futsal y Vóley",
    description: "Solicita tu código de acceso por WhatsApp y completa la inscripción en línea.",
    type: "website",
    locale: "es_PE"
  }
};

export const viewport: Viewport = {
  themeColor: "#171B4F"
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
