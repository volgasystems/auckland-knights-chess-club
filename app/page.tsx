// Tournament data is managed in admin and must be read on every request.
export const dynamic = "force-dynamic";

import GalleryAlbums from "@/components/GalleryAlbums";
import { galleryAlbums } from "@/lib/gallery";
import PageShell from "@/components/PageShell";
import Hero from "@/components/Hero";
import FeatureStrip from "@/components/FeatureStrip";
import StayConnected from "@/components/StayConnected";
import HomeTournamentsList from "@/components/HomeTournamentsList";
import Link from "next/link";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { formatDate } from "@/lib/format";

export default async function HomePage() {
  const service = createSupabaseServiceClient();
  const [{ data: tournaments }, { data: news }, { data: settings }, { data: galleryPhotos }] = await Promise.all([
    service.from("tournaments").select("*").eq("tournament_type", "general_open").in("status", ["open", "closed"]).order("start_date", { ascending: true }).limit(9),
    service.from("news_posts").select("*").eq("is_published", true).order("published_at", { ascending: false }).limit(3),
    service.from("club_settings").select("*").eq("id", "default").maybeSingle(),
    service.from("gallery_photos").select("*").eq("is_published", true).order("event_date", { ascending: false }).order("created_at", { ascending: false })
  ]);
  const mapAddress = settings?.club_address || "East Auckland, New Zealand";
  const mapSrc = `https://maps.google.com/maps?q=${encodeURIComponent(mapAddress)}&output=embed`;

  return <PageShell>
    <Hero />
    <FeatureStrip />
    <main className="container-page py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-stone-100 p-5"><p className="font-bold">Join the club, find your member record or renew membership.</p><Link href="/join#membership-search" className="btn-primary">Join Now / Find Member</Link></div>
      <div className="grid gap-8 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-extrabold uppercase tracking-wide">Upcoming Public Tournaments</h2>
              <p className="mt-1 text-sm text-stone-600">General/open tournaments and paid public events. Club calendar events are listed under Calendar and Tournaments.</p>
            </div>
            <Link href="/tournaments" className="shrink-0 text-sm font-bold text-black">View All</Link>
          </div>
          {(tournaments || []).length > 0 ? <HomeTournamentsList tournaments={tournaments || []} /> : <div className="card p-5 text-sm text-stone-600">No public tournaments are published yet.</div>}
        </section>
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-extrabold uppercase tracking-wide">Latest News</h2>
            <Link href="/news" className="text-sm font-bold text-black">View All</Link>
          </div>
          <div className="space-y-4">
            {(news || []).map((n:any)=><Link key={n.id} href={`/news/${n.slug}`} className="card flex gap-3 p-3 hover:border-black">
              {n.image_url ? <img src={n.image_url} alt={n.title} className="h-20 w-24 rounded-lg object-cover" /> : null}
              <div><h3 className="font-bold">{n.title}</h3><p className="text-xs text-stone-500">{formatDate(n.published_at)}</p><p className="mt-1 line-clamp-2 text-sm text-stone-600">{n.summary}</p></div>
            </Link>)}
            {(!news || news.length === 0) && <div className="card p-5 text-sm text-stone-600">No news has been published yet.</div>}
          </div>
        </section>
      </div>
      <section className="mt-10"><div className="flex items-center justify-between gap-4"><h2 className="text-2xl font-extrabold">Event Photo Gallery</h2><Link href="/photo-gallery" className="font-bold">View All Events</Link></div>{galleryPhotos?.length ? <GalleryAlbums albums={galleryAlbums(galleryPhotos).slice(0, 3)} /> : <p className="card mt-5 p-5 text-stone-600">Event albums will appear here when photos are published.</p>}</section>
      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="text-2xl font-extrabold">Find Us</h2>
          <p className="mt-3 text-stone-700">{mapAddress}</p>
          <p className="mt-3 text-sm text-stone-500">The map updates automatically from the Club Settings address.</p>
          <Link href="/contact" className="btn-secondary mt-5">Contact Us</Link>
        </div>
        <div className="card overflow-hidden">
          <iframe title="Club location map" src={mapSrc} className="h-80 w-full border-0" loading="lazy" />
        </div>
      </section>
    </main>
    <StayConnected settings={settings} />
  </PageShell>
}
