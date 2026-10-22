import { publicClubSettings } from "@/lib/publicClubSettings";
import { clubStructuredData } from "@/lib/clubIdentity";
import type { Metadata } from "next";
import "./globals.css";
import { SITE_URL } from "@/lib/seo";
import StructuredData from "@/components/StructuredData";
import PWARegister from "@/components/PWARegister";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Auckland Knights Chess Club | Auckland, NZ", template: "%s | Auckland Knights Chess Club" },
  description: "Auckland Knights Chess Club serving East Auckland and South Auckland.",
  manifest: "/manifest.webmanifest",
  applicationName: "Auckland Knights Chess Club",
  appleWebApp: {
    capable: true,
    title: "AKCC",
    statusBarStyle: "black-translucent"
  },
  icons: {
    icon: [
      { url: "/pwa-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/pwa-icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [{ url: "/pwa-icon-192.png", sizes: "192x192", type: "image/png" }]
  }
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await publicClubSettings();
  return (
    <html lang="en-NZ">
      <body><StructuredData data={clubStructuredData(settings)} /><PWARegister />{children}</body>
    </html>
  );
}
