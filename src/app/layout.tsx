import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible, Barlow_Condensed } from "next/font/google";
import "./globals.css";

// Barlow Condensed: havuz skor tabelası gibi dar, okunaklı rakamlar (saatler, kulvar numaraları).
// Atkinson Hyperlegible: telefonda, ıslak elle bile okunması kolay gövde metni.
const display = Barlow_Condensed({
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});
const body = Atkinson_Hyperlegible({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "GTÜ Havuz — Seans Rezervasyonu",
  description: "GTÜ yüzme havuzu seans ve kulvar rezervasyonu",
};

export const viewport: Viewport = {
  themeColor: "#0E3B5C",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
