import type { Metadata } from "next";
import "./globals.css";
import PWARegister from "@/components/PWARegister";

export const metadata: Metadata = {
  title: "Auckland Knights Chess Club",
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body><PWARegister />{children}</body>
    </html>
  );
}
