import { requireAdmin } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import CrudManager from "@/components/admin/CrudManager";
import { canUseSocialMedia } from "@/lib/roles";
import { RATING_FORMAT_OPTIONS, RATING_TYPE_OPTIONS, ROUND_OPTIONS, TIME_CONTROL_OPTIONS, TOURNAMENT_SYSTEM_OPTIONS } from "@/lib/tournamentOptions";

export default async function TournamentsAdmin(){
  const admin = await requireAdmin("tournaments");
  const s=createSupabaseServiceClient();
  const {data}=await s.from("tournaments").select("*").order("start_date",{ascending:false});
  const fields:any[] = [
    {name:'title',label:'Tournament name',required:true},
    {name:'slug',label:'Slug'},
    {name:'description',label:'Description',textarea:true},
    {name:'status',label:'Status',options:['draft','open','closed','completed','archived']},
    {name:'tournament_type',label:'Tournament type',options:['club_calendar','general_open'],help:'Club Calendar Event is covered by active membership. General/Open Tournament requires separate payment.'},
    {name:'show_in_calendar',label:'Show in Calendar',type:'checkbox'},
    {name:'tournament_year',label:'Year',type:'number',help:'Example: 2026. This can be derived from the start date, but you can override it.'},
    {name:'date_display',label:'Date display text',help:'Examples: Mar 23 – May 18; May 25 and June 8; Jan 24 – Jan 26; Every Monday from Feb 2 to Mar 16'},
    {name:'start_date',label:'Start Date',type:'date'},
    {name:'end_date',label:'End Date',type:'date'},
    {name:'venue_name',label:'Venue name'},
    {name:'venue_address',label:'Venue address',type:'address',help:'Use Search NZ address below to autocomplete the venue address.'},
    {name:'rating_format',label:'Rating format',options:RATING_FORMAT_OPTIONS,help:'Classical, Rapid, Blitz, etc.'},
    {name:'time_control',label:'Time control',options:TIME_CONTROL_OPTIONS,help:'Choose common chess time controls. Select Custom only if the exact control is not listed.'},
    {name:'custom_time_control',label:'Custom time control',help:'Use only if Time control = Custom. Example: 12+3 or 90+30.'},
    {name:'rounds_display',label:'Number of rounds',options:ROUND_OPTIONS,help:'Choose Custom if the exact number is not listed.'},
    {name:'rounds',label:'Custom rounds number',type:'number',help:'Use only if Number of rounds = Custom or if you need to override.'},
    {name:'tournament_system',label:'Tournament system',options:TOURNAMENT_SYSTEM_OPTIONS,help:'Swiss-system, Round-Robin, Knockout, Scheveningen, Arena, etc.'},
    {name:'rating_type',label:'Rating type',options:RATING_TYPE_OPTIONS,help:'FIDE Rated, NZCF Rated, FIDE & NZCF Rated, Non-rated, etc.'},
    {name:'tournament_image_url',label:'Tournament image - optional',type:'image',imageBucket:'tournament-images',help:'Optional. If no image is uploaded, no placeholder image is shown on public pages.'},
    {name:'entry_fee_cents',label:'Default entry fee ($) - general/open only',type:'money',help:'Enter dollars, e.g. 25 for $25.00. Stripe conversion to cents is automatic.'},
    {name:'category_options',label:'General tournament categories and fees',type:'categories'},
    {name:'tournament_prizes',label:'Prize fund / winners',type:'prizes'},
    {name:'max_players',label:'Maximum players',type:'number'},
    {name:'registration_open_at',label:'Registration open date',type:'date'},
    {name:'registration_close_at',label:'Registration close date',type:'date'},
    {name:'allow_public_registration',label:'Allow public registration',type:'checkbox'},
    {name:'allow_non_members',label:'Allow non-member registration - general/open only',type:'checkbox'},
    {name:'require_payment',label:'Require separate payment - general/open only',type:'checkbox'},
    {name:'show_public_entries',label:'Show public entries',type:'checkbox'},
    {name:'vega_url',label:'Vega URL'},
    {name:'lichess_url',label:'Lichess live board / broadcast URL'},
    {name:'pgn_url',label:'PGN URL'},
    {name:'winner_photo_url',label:'Winner photo',type:'image',imageBucket:'winner-images'},
    {name:'first_place_name',label:'First place name'},
    {name:'second_place_name',label:'Second place name'},
    {name:'third_place_name',label:'Third place name'},
    {name:'result_summary',label:'Result summary',textarea:true},
    {name:'prize_details',label:'Overall prize details',textarea:true}
  ];
  if (canUseSocialMedia(admin.profile.role)) {
    fields.push({name:'publish_to_social',label:'Create social media post draft when saving',type:'checkbox'});
    fields.push({name:'social_platforms',label:'Select social media platforms',type:'multi_options',options:['Facebook','Instagram','YouTube','X','LinkedIn']});
  }
  return <div><CrudManager table="tournaments" title="Manage Tournaments, Calendar Events and General Events" rows={data||[]} fields={fields} /><div className="card mt-6 p-5 text-sm text-slate-700"><b>Registration rules:</b><br/>• Club Calendar Event: active AK membership ID/email required, no separate payment.<br/>• General/Open Tournament: appears in Calendar and Results, but registration is confirmed only after Stripe payment.</div></div>;
}
