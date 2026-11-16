import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: { default: "LoRaWAN Console", template: "%s · LoRaWAN Console" },
  description: "A clear, secure way to run your organization's private LoRaWAN network.",
  openGraph: {
    title: "LoRaWAN Console — Community Hub",
    description: "LoRaWAN gateways, sensors, readings, downlinks, and network health in one secure platform.",
    images: [{ url: "/og.png", width: 1731, height: 909, alt: "LoRaWAN campus sensor network" }],
  },
  twitter: { card: "summary_large_image", title: "LoRaWAN · Community Hub", description: "Your LoRaWAN network. One clear picture.", images: ["/og.png"] },
  icons: {
    icon: "/favicon.svg?v=2",
    shortcut: "/favicon.svg?v=2",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
