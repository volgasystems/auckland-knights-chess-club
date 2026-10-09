import { requireAdmin } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import EventGalleryManager from "@/components/admin/EventGalleryManager";
export default async function GalleryAdmin() {
  await requireAdmin("gallery");
  const s = createSupabaseServiceClient();
  const [{ data, error }, { error: schemaError }] = await Promise.all([s.from("gallery_photos").select("*").order("created_at", { ascending: false }), s.from("gallery_photos").select("event_name").limit(0)]);
  if (error) throw new Error("Unable to load gallery photos. Please try again.");
  return <EventGalleryManager rows={data || []} ready={!schemaError} />;
}
