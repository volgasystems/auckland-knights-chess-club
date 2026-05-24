import { requireAdmin } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import CrudManager from "@/components/admin/CrudManager";

export default async function LiveBoardsAdmin(){
  await requireAdmin("live_boards");
  const s=createSupabaseServiceClient();
  const {data}=await s.from("live_board_links").select("*").order("display_order",{ascending:true}).order("created_at",{ascending:false});
  return <CrudManager table="live_board_links" title="Manage Live Boards" rows={data||[]} fields={[
    {name:'title',label:'Title',required:true},
    {name:'tournament_name',label:'Tournament name'},
    {name:'year',label:'Year',type:'number'},
    {name:'date_display',label:'Date display text'},
    {name:'vega_url',label:'Vega page link'},
    {name:'lichess_url',label:'Lichess broadcast link'},
    {name:'embed_url',label:'Embed / live board URL'},
    {name:'status',label:'Status',options:['current','recent','archived']},
    {name:'display_order',label:'Display order',type:'number'},
    {name:'is_published',label:'Publish this live board link',type:'checkbox'}
  ]} />;
}
