import { requireAdmin } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import CrudManager from "@/components/admin/CrudManager";

export default async function MemberNoticesAdmin(){
  await requireAdmin("member_notices");
  const s=createSupabaseServiceClient();
  const {data}=await s.from("member_notices").select("*").order("created_at",{ascending:false});
  return <div><CrudManager table="member_notices" title="Member Notices History" rows={data||[]} fields={[
    {name:'title',label:'Notice title',required:true},
    {name:'target_group',label:'Target group',options:['active','expired','expiring_soon','all','selected']},
    {name:'subject',label:'Subject',required:true},
    {name:'body',label:'Body',textarea:true,required:true},
    {name:'recipient_count',label:'Recipient count',type:'number'},
    {name:'status',label:'Status',options:['draft','sent','failed']},
    {name:'sent_at',label:'Sent date',type:'date'}
  ]}/><div className="card mt-6 p-5 text-sm text-slate-700">Use <b>Bulk Email</b> to choose a template, preview recipients and send a notice. This page keeps the notice history.</div></div>;
}
