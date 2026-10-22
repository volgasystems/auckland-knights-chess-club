import { cache } from "react";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
// Request-scoped shared public fields: never pass email-provider credentials into public markup.
export const publicClubSettings = cache(async () => {
  try {
    const {data,error} = await createSupabaseServiceClient().from("club_settings").select("club_address,general_email,facebook_url,instagram_url,youtube_url,lichess_url,x_url,linkedin_url,main_club_schedule,junior_club_schedule,senior_club_captain_name,club_captain_name,senior_club_captain_email,junior_club_captain_name,junior_club_captain_email").eq("id","default").maybeSingle();
    return error ? null : data;
  } catch { return null; }
});
