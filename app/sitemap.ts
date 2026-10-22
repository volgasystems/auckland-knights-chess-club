import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes = ["", "/about", "/join", "/contact", "/coaching", "/news", "/tournaments", "/calendar", "/results", "/faq", "/photo-gallery", "/live-boards", "/agm", "/links"];
  const entries: MetadataRoute.Sitemap = routes.map(path => ({ url: `${SITE_URL}${path || "/"}` }));
  try {
    const db = createSupabaseServiceClient();
    const [news, tournaments] = await Promise.all([db.from("news_posts").select("slug,updated_at").eq("is_published", true), db.from("tournaments").select("slug,updated_at").in("status", ["open", "closed", "completed"])]);
    for (const [prefix, result] of [["news", news], ["tournaments", tournaments]] as const) {
      if (result.error) throw result.error;
      for (const row of result.data || []) { if (!row.slug) continue; const date = row.updated_at && new Date(row.updated_at); entries.push({ url: `${SITE_URL}/${prefix}/${encodeURIComponent(row.slug)}`, ...(date && !isNaN(date.getTime()) ? { lastModified: date } : {}) }); }
    }
  } catch { console.warn("Sitemap: dynamic content unavailable; returning public page URLs."); }
  return entries;
}
