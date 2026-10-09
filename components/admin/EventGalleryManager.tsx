"use client";
import { useState } from "react";
import CrudManager from "@/components/admin/CrudManager";
import { galleryAlbums } from "@/lib/gallery";
export default function EventGalleryManager({ rows, ready }: { rows: any[]; ready: boolean }) {
  const albums = galleryAlbums(rows);
  const [selected, setSelected] = useState("");
  const album = albums.find(a => a.key === selected);
  return <div><h1 className="text-3xl font-extrabold">Event Photo Gallery</h1><p className="mt-2 text-stone-600">Use the same event name and date for every photo in an album. Only published photos appear on the home page and public gallery.</p>
    {!ready && <p role="alert" className="mt-4 rounded-lg bg-amber-50 p-4">Run supabase/migration_v4_5_event_gallery.sql in Supabase SQL Editor to enable event names. Existing photos remain available and are grouped by date.</p>}
    <label className="mt-5 block"><span className="admin-label">Manage an event album</span><select value={selected} onChange={e => setSelected(e.target.value)} className="admin-input"><option value="">All photos / new event</option>{albums.map(a => <option key={a.key} value={a.key}>{a.name}{a.date ? ` · ${a.date}` : ""} ({a.photos.length} photos)</option>)}</select></label>
    <div className="mt-6"><CrudManager key={selected} table="gallery_photos" title={album ? `Photos: ${album.name}` : "Add or edit event photos"} rows={album?.photos || rows} initialValues={album ? { event_name: album.photos[0]?.event_name || "", event_date: album.date } : {}} fields={[...(ready ? [{name:"event_name",label:"Event / album name",required:true,help:"Example: Inaugural Rapid Open 2026. Reuse exactly the same name and date to add another photo to this event."}] : []),{name:"event_date",label:"Event date",type:"date",required:ready},{name:"title",label:"Photo title / caption",required:true},{name:"description",label:"Photo description",textarea:true},{name:"image_url",label:"Photo",type:"image",imageBucket:"gallery-images",required:true},{name:"is_published",label:"Publish photo",type:"checkbox"}]} /></div>
  </div>;
}
