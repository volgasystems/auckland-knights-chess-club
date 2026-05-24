import { requireAdmin } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import CrudManager from "@/components/admin/CrudManager";
export default async function CoachingAdmin(){
  await requireAdmin("coaching");
  const s=createSupabaseServiceClient();
  const {data}=await s.from("coaches").select("*").order("display_order",{ascending:true});
  return <CrudManager table="coaches" title="Manage Coaches" rows={data||[]} fields={[
    {name:'name',label:'Coach name',required:true},
    {name:'title',label:'Title / qualification'},
    {name:'bio',label:'Bio',textarea:true},
    {name:'specialisation',label:'Specialisation'},
    {name:'email',label:'Email'},
    {name:'phone',label:'Phone'},
    {name:'booking_link',label:'Online / booking link'},
    {name:'image_url',label:'Coach photo',type:'image',imageBucket:'coach-images'},
    {name:'display_order',label:'Display order',type:'number'},
    {name:'is_published',label:'Publish coach',type:'checkbox'}
  ]} />
}
