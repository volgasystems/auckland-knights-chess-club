import { requireAdmin } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import CrudManager from "@/components/admin/CrudManager";

export default async function MembershipOptionsAdmin(){
  await requireAdmin("membership_options");
  const s=createSupabaseServiceClient();
  const {data}=await s.from("membership_options").select("*").order("display_order",{ascending:true}).order("created_at",{ascending:true});
  return <CrudManager table="membership_options" title="Membership Options and Fees" rows={data||[]} fields={[
    {name:'name',label:'Membership option name',required:true},
    {name:'key',label:'Internal key - optional'},
    {name:'description',label:'Description',textarea:true},
    {name:'fee_cents',label:'Fee ($)',type:'money',required:true,help:'Enter normal dollars, e.g. 75 for $75.00. Stripe conversion to cents is automatic.'},
    {name:'joining_period',label:'Joining period / condition'},
    {name:'display_order',label:'Display order',type:'number'},
    {name:'validity_months',label:'Validity months',type:'number'},
    {name:'valid_until_month',label:'Valid until month number',type:'number',help:'12 means membership expires on 31 December. Use 6 for 30 June if needed.'},
    {name:'is_active',label:'Active / show on Join page',type:'checkbox'}
  ]} />;
}
