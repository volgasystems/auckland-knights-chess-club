import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";
export default function robots(): MetadataRoute.Robots { return { rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/club-admin/", "/admin/", "/payment/", "/absence"] }, sitemap: `${SITE_URL}/sitemap.xml`, host: SITE_URL }; }
