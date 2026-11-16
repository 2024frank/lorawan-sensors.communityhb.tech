import type { Metadata } from "next";
import { Comfortaa, Figtree } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

// Community Hub's type: Figtree for every word, Comfortaa only in the wordmark.
const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

const comfortaa = Comfortaa({
  variable: "--font-comfortaa",
  subsets: ["latin"],
  weight: ["700"],
});

const DESCRIPTION = "LoRaWAN makes it easy for schools and campuses to run their own private network of environmental sensors.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: { default: "LoRaWAN Console", template: "%s · LoRaWAN Console" },
  description: DESCRIPTION,
  openGraph: {
    title: "LoRaWAN Console — Community Hub",
    description: DESCRIPTION,
    images: [{ url: "/og.png", width: 1731, height: 909, alt: "LoRaWAN campus sensor network" }],
  },
  twitter: { card: "summary_large_image", title: "LoRaWAN · Community Hub", description: DESCRIPTION, images: ["/og.png"] },
  icons: {
    icon: "/favicon.svg?v=3",
    shortcut: "/favicon.svg?v=3",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${figtree.variable} ${comfortaa.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
