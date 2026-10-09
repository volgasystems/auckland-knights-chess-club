import Link from "next/link";
import { albumUrl, galleryAlbums } from "@/lib/gallery";
import { formatDate } from "@/lib/format";
export default function GalleryAlbums({ albums }: { albums: ReturnType<typeof galleryAlbums> }) {
  return <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{albums.map(album => <Link key={album.key} href={albumUrl(album.key)} className="card overflow-hidden hover:border-black">
    {album.photos[0]?.image_url && <img src={album.photos[0].image_url} alt={album.name} loading="lazy" className="h-48 w-full object-cover" />}
    <div className="p-5">{album.date && <p className="text-xs font-bold text-akcc-blue">{formatDate(album.date)}</p>}<h3 className="mt-1 text-lg font-extrabold">{album.name}</h3><p className="mt-2 text-sm text-stone-600">{album.photos.length} {album.photos.length === 1 ? "photo" : "photos"} · View event album</p></div>
  </Link>)}</div>;
}
