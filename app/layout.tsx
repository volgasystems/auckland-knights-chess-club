import { CLUB_CONTACT_EMAIL, CLUB_CONTACT_PHONE } from "@/lib/clubContact";
import type { Metadata } from "next";
import "./globals.css";
import { SITE_URL, CLUB_NAME } from "@/lib/seo";
import StructuredData from "@/components/StructuredData";
import PWARegister from "@/components/PWARegister";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Auckland Knights Chess Club | East & South Auckland Chess", template: "%s | Auckland Knights Chess Club" },
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
    <html lang="en-NZ">
      <body><StructuredData data={{ "@context": "https://schema.org", "@graph": [{ "@type": "SportsOrganization", "@id": `${SITE_URL}/#club`, name: CLUB_NAME, url: SITE_URL, logo: `${SITE_URL}/logo.png`, sport: "Chess", email: CLUB_CONTACT_EMAIL, telephone: CLUB_CONTACT_PHONE, areaServed: ["East Auckland", "South Auckland"], description: "A community chess club welcoming children, beginners and adults across East Auckland and South Auckland." }, { "@type": "WebSite", "@id": `${SITE_URL}/#website`, name: CLUB_NAME, url: SITE_URL, inLanguage: "en-NZ", publisher: { "@id": `${SITE_URL}/#club` } }] }} /><PWARegister />{children}</body>
    </html>
  );
}
