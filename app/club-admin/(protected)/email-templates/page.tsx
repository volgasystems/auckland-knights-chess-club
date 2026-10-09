import { requireAdmin } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import CrudManager from "@/components/admin/CrudManager";

export default async function EmailTemplatesAdmin(){
  await requireAdmin("email_templates");
  const s=createSupabaseServiceClient();
  const {data}=await s.from("email_templates").select("*").order("name",{ascending:true});
  return <div><CrudManager table="email_templates" title="Email Templates" rows={data||[]} fields={[
    {name:'name',label:'Template name',required:true},
    {name:'template_key',label:'Template key - optional'},
    {name:'subject',label:'Email subject',required:true},
    {name:'body',label:'Email body',textarea:true,required:true,help:'Press Enter for line breaks. Legacy \n sequences are converted automatically when sending. Use placeholders like {{first_name}}, {{membership_id}}, {{membership_end_date}}, {{tournament_name}}, {{message}}.'},
    {name:'is_active',label:'Active',type:'checkbox'}
  ]}/><div className="card mt-6 p-5 text-sm text-slate-700"><b>Available placeholders:</b> {'{{first_name}}'}, {'{{last_name}}'}, {'{{full_name}}'}, {'{{email}}'}, {'{{membership_id}}'}, {'{{membership_start_date}}'}, {'{{membership_end_date}}'}, {'{{tournament_name}}'}, {'{{message}}'}, {'{{club_name}}'}.<p className="mt-3">Tournament placeholders require registration details. Bulk email previews and tests show sample values; member bulk sends cannot use tournament confirmation templates.</p></div></div>;
}
