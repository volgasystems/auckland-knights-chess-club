import { requireAdmin } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import BulkEmailManager from "@/components/admin/BulkEmailManager";
import { getEmailProviderStatus } from "@/lib/email";

export default async function BulkEmailAdmin(){
  await requireAdmin("bulk_email");
  const s=createSupabaseServiceClient();
  const {data:templates}=await s.from("email_templates").select("*").eq("is_active", true).order("name",{ascending:true});
  const {data:members}=await s.from("club_memberships").select("*").order("created_at",{ascending:false});
  return <BulkEmailManager templates={templates||[]} members={members||[]} providerStatus={await getEmailProviderStatus()} />;
}
