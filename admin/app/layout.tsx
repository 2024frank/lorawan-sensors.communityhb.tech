import type { Metadata } from "next";
import { Comfortaa, Figtree } from "next/font/google";
import "./globals.css";

// Community Hub's type: Figtree for every word, Comfortaa only in the wordmark.
const figtree = Figtree({ variable: "--font-figtree", subsets: ["latin"] });
const comfortaa = Comfortaa({ variable: "--font-comfortaa", subsets: ["latin"], weight: ["700"] });

export const metadata: Metadata = {
  title: { default: "LoRaWAN Operator", template: "%s · LoRaWAN Operator" },
  description: "Operator console: onboard organizations and provision their people.",
  icons: { icon: "/favicon.svg?v=3", shortcut: "/favicon.svg?v=3" },
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${figtree.variable} ${comfortaa.variable} min-h-screen antialiased`}>{children}</body>
    </html>
  );
}
