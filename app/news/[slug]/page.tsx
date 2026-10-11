import { cache } from "react";
import { pageMetadata, plainDescription, SITE_URL, CLUB_NAME } from "@/lib/seo";
import StructuredData from "@/components/StructuredData";
const getNews = cache(async (slug: string) => { const db = createSupabaseServiceClient(); const { data } = await db.from("news_posts").select("*").eq("slug", slug).eq("is_published", true).maybeSingle(); return data; });
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; const n = await getNews(slug); if (!n) return { title: "News not found", robots: { index: false } }; const metadata = pageMetadata(n.title, plainDescription(n.summary || n.content), `/news/${encodeURIComponent(n.slug)}`); return { ...metadata, openGraph: { ...metadata.openGraph, type: "article" as const, ...(n.image_url ? { images: [{ url: n.image_url, alt: n.title }] } : {}) } }; }
import MeetingSummary from "@/components/MeetingSummary";
import PageShell from "@/components/PageShell";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { notFound } from "next/navigation";
import { formatDate } from "@/lib/format";

export default async function NewsDetail({ params }: { params: Promise<{slug:string}> }) {
  const { slug } = await params;
  const n = await getNews(slug);
  if(!n) notFound();
  const site = SITE_URL;
  const url = `${site}/news/${n.slug}`;
  return <PageShell><StructuredData data={{ "@context": "https://schema.org", "@type": "NewsArticle", headline: n.title, description: plainDescription(n.summary || n.content), url, mainEntityOfPage: url, ...(n.published_at ? { datePublished: n.published_at } : {}), ...(n.updated_at ? { dateModified: n.updated_at } : {}), ...(n.image_url ? { image: n.image_url } : {}), publisher: { "@type": "SportsOrganization", "@id": `${SITE_URL}/#club`, name: CLUB_NAME } }} /><main className="container-page py-12"><article className="card overflow-hidden">{n.image_url && <img src={n.image_url} alt={n.title} className="h-96 w-full object-cover"/>}<div className="p-8"><p className="text-sm font-bold text-akcc-blue">{formatDate(n.published_at)}</p><h1 className="mt-2 text-4xl font-extrabold">{n.title}</h1><div className="mt-4 flex flex-wrap gap-2"><a className="btn-secondary py-2" target="_blank" rel="noreferrer" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}>Share to Facebook</a><a className="btn-secondary py-2" target="_blank" rel="noreferrer" href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(n.title)}`}>Share to X</a><a className="btn-secondary py-2" target="_blank" rel="noreferrer" href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`}>Share to LinkedIn</a></div><MeetingSummary text={n.content}/></div></article></main></PageShell>
}
