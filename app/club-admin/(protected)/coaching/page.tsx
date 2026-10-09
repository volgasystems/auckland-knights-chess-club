import { requireAdmin } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import CrudManager from "@/components/admin/CrudManager";
export default async function CoachingAdmin(){
  await requireAdmin("coaching");
  const s=createSupabaseServiceClient();
  const {data}=await s.from("coaches").select("*").order("display_order",{ascending:true});
  const {data:topics}=await s.from("coaching_topics").select("*").order("topic_date",{ascending:false});
  return <div className="space-y-10"><CrudManager table="coaches" title="Manage Coaches" rows={data||[]} fields={[
    {name:'name',label:'Coach name',required:true},
    {name:'title',label:'Title / qualification'},
    {name:'bio',label:'Bio',type: "richtext"},
    {name:'specialisation',label:'Specialisation'},
    {name:'email',label:'Email'},
    {name:'phone',label:'Phone'},
    {name:'booking_link',label:'Online / booking link'},
    {name:'image_url',label:'Coach photo',type:'image',imageBucket:'coach-images'},
    {name:'display_order',label:'Display order',type:'number'},
    {name:'is_published',label:'Publish coach',type:'checkbox'}
  ]} />
  <CrudManager table="coaching_topics" title="Weekly Coaching Topics" rows={topics||[]} fields={[
    {name:"title",label:"Topic title",required:true},
    {name:"topic_date",label:"Date",type:"date"},
    {name:"skill_level",label:"Skill level"},
    {name:"description",label:"Topic description",type:"richtext"},
    {name:"coach_id",label:"Coach",choices:(data||[]).map(c=>({value:c.id,label:c.name}))},
    {name:"join_link",label:"Join link",type:"url"},
    {name:"is_published",label:"Publish topic",type:"checkbox"}
  ]}/></div>
}
