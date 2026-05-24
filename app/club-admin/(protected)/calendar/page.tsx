import { requireAdmin } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import CrudManager from "@/components/admin/CrudManager";
import { RATING_FORMAT_OPTIONS, RATING_TYPE_OPTIONS, ROUND_OPTIONS, TIME_CONTROL_OPTIONS, TOURNAMENT_SYSTEM_OPTIONS } from "@/lib/tournamentOptions";

export default async function CalendarAdmin(){
  await requireAdmin("calendar");
  const s=createSupabaseServiceClient();
  const [{data:settings},{data}]=await Promise.all([
    s.from("club_settings").select("*").eq("id","default"),
    s.from("tournaments").select("*").order("start_date",{ascending:true})
  ]);
  return <div className="space-y-10">
    <CrudManager table="club_settings" title="Calendar Title and Description" rows={settings||[]} fields={[
      {name:'calendar_title',label:'Calendar year title',required:true,help:'Example: 2026 Calendar. Next year change this to 2027 Calendar.'},
      {name:'calendar_description',label:'Calendar description / intro text',textarea:true,help:'This appears under the Calendar title on the public website.'},
      {name:'is_published',label:'Publish settings',type:'checkbox'}
    ]} />

    <CrudManager table="tournaments" title="Calendar Events and Tournament Links" rows={data||[]} fields={[
      {name:'title',label:'Tournament / event name',required:true},
      {name:'slug',label:'Slug'},
      {name:'show_in_calendar',label:'Show in Calendar',type:'checkbox'},
      {name:'linked_tournament_id',label:'Linked tournament ID optional',help:'Optional advanced field. Usually leave blank because this calendar item is already the tournament record.'},
      {name:'tournament_type',label:'Event type',options:['club_calendar','general_open']},
      {name:'status',label:'Status',options:['draft','open','closed','completed','archived']},
      {name:'tournament_year',label:'Year',type:'number',help:'Example: 2026. This can be derived from the start date, but you can override it.'},
      {name:'date_display',label:'Date display text',help:'Examples: Mar 23 – May 18; May 25 and June 8; Jan 24 – Jan 26; Every Monday from Feb 2 to Mar 16'},
      {name:'start_date',label:'Start Date',type:'date'},
      {name:'end_date',label:'End Date',type:'date'},
      {name:'rating_format',label:'Rating format',options:RATING_FORMAT_OPTIONS},
      {name:'time_control',label:'Time control',options:TIME_CONTROL_OPTIONS},
      {name:'custom_time_control',label:'Custom time control',help:'Use only when Time control = Custom.'},
      {name:'rounds_display',label:'Number of rounds',options:ROUND_OPTIONS},
      {name:'rounds',label:'Custom rounds number',type:'number'},
      {name:'tournament_system',label:'Tournament system',options:TOURNAMENT_SYSTEM_OPTIONS},
      {name:'rating_type',label:'Rating type',options:RATING_TYPE_OPTIONS},
      {name:'venue_name',label:'Venue name'},
      {name:'venue_address',label:'Venue address',type:'address',help:'Use Search NZ address below to autocomplete the venue address.'},
      {name:'description',label:'Small description',textarea:true},
      {name:'allow_public_registration',label:'Allow registration / enrolment link',type:'checkbox'},
      {name:'require_payment',label:'Require separate payment - general/open only',type:'checkbox'},
      {name:'tournament_image_url',label:'Tournament image - optional',type:'image',imageBucket:'tournament-images'},
      {name:'entry_fee_cents',label:'Default fee ($) - general/open only',type:'money',help:'Enter dollars, e.g. 25 for $25.00. Stripe conversion to cents is automatic.'},
      {name:'category_options',label:'Categories and fees - general/open only',type:'categories'},
      {name:'tournament_prizes',label:'Prize fund',type:'prizes'},
      {name:'lichess_url',label:'Lichess broadcast link'},
      {name:'vega_url',label:'Vega page link'},
      {name:'pgn_url',label:'PGN link'}
    ]} />
  </div>;
}
