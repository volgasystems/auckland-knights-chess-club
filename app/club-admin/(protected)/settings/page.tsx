import { requireAdmin } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import SettingsManager from "@/components/admin/SettingsManager";

export default async function SettingsAdmin(){
  await requireAdmin("settings");
  const s=createSupabaseServiceClient();
  const {data}=await s.from("club_settings").select("*").eq("id","default").maybeSingle();
  return <SettingsManager initial={data || null} />;
}
