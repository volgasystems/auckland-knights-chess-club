export const dynamic = "force-dynamic";
import PageShell from "@/components/PageShell";
import GalleryAlbums from "@/components/GalleryAlbums";
import Link from "next/link";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { formatDate } from "@/lib/format";
import { galleryAlbums } from "@/lib/gallery";
export default async function GalleryPage({ searchParams }: { searchParams: Promise<{ album?: string }> }) {
  const { album } = await searchParams;
  const service = createSupabaseServiceClient();
  const { data, error } = await service.from("gallery_photos").select("*").eq("is_published", true).order("event_date", { ascending: false }).order("created_at", { ascending: false });
  const albums = galleryAlbums(data || []);
  const selected = albums.find(a => a.key === album);
  return <PageShell><main className="container-page py-12">
    <h1 className="text-4xl font-extrabold">{selected ? selected.name : "Photo Gallery"}</h1>
    <p className="mt-3 text-stone-600">{selected ? `${selected.date ? formatDate(selected.date) + " · " : ""}${selected.photos.length} photos` : "Browse tournament, prize-giving and club photos by event."}</p>
    {album && <Link href="/photo-gallery" className="btn-secondary mt-5">All Events</Link>}
    {error ? <p role="alert" className="card mt-8 p-6">Unable to load the gallery. Please try again.</p> : album && !selected ? <p className="card mt-8 p-6">This event album is not available.</p> : selected ? <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{selected.photos.map((p: any) => <article key={p.id} className="card overflow-hidden"><a href={p.image_url} target="_blank" rel="noopener noreferrer"><img src={p.image_url} alt={p.title || selected.name} loading="lazy" className="h-56 w-full object-contain bg-stone-100" /></a><div className="p-5"><h2 className="font-extrabold">{p.title}</h2><p className="mt-2 whitespace-pre-line text-sm text-stone-600">{p.description}</p></div></article>)}</div> : albums.length ? <GalleryAlbums albums={albums} /> : <p className="card mt-8 p-6 text-stone-600">No event photos have been published yet.</p>}
  </main></PageShell>;
}
