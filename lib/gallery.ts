export function galleryAlbums(photos: any[]) {
  const albums = new Map<string, { key: string; name: string; date: string; photos: any[] }>();
  for (const photo of photos) {
    const name = String(photo.event_name || "").trim() || (photo.event_date ? "Club event" : "Club photos");
    const date = String(photo.event_date || "").slice(0, 10);
    const key = JSON.stringify([name.toLocaleLowerCase("en-NZ"), date]);
    if (!albums.has(key)) albums.set(key, { key, name, date, photos: [] });
    albums.get(key)!.photos.push(photo);
  }
  return [...albums.values()].sort((a, b) => b.date.localeCompare(a.date) || a.name.localeCompare(b.name));
}
export function albumUrl(key: string) { return `/photo-gallery?album=${encodeURIComponent(key)}`; }
