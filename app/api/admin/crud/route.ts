import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentAdmin } from "@/lib/auth";
import { canAccessTable } from "@/lib/roles";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { tournamentRounds } from "@/lib/tournamentOptions";
import { slugify } from "@/lib/format";

const allowed = new Set(["payment_accounts","news_posts","tournaments","gallery_photos","faqs","coaches","coaching_topics","agm_meetings","agm_decisions","elected_team_members","club_settings","absences","social_posts","live_board_links","membership_options","contact_enquiries","email_templates","member_notices"]);
const numericFields = new Set(["tournament_year","rounds","entry_fee_cents","max_players","display_order","nzcf_rating","fide_rating","fee_cents","validity_months","valid_until_month"]);
const booleanFields = new Set(["is_published","allow_public_registration","allow_non_members","require_payment","show_public_entries","publish_to_social","is_active","show_in_calendar","publish_as_news"]);

async function maybeCreateSocialDraft(s: any, table: string, data: any, clean: any, userId: string) {
  if (!clean.publish_to_social) return;
  const platforms = Array.isArray(clean.social_platforms) ? clean.social_platforms : [];
  if (!platforms.length) return;
  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  if (table === "news_posts") {
    const url = data.slug ? `${site}/news/${data.slug}` : `${site}/news`;
    const caption = `${data.title}\n\n${data.summary || "Read the latest update from Auckland Knights Chess Club."}\n\n${url}`;
    await s.from("social_posts").insert({ title: data.title, post_type: "news", source_table: table, source_id: data.id, message: caption, image_url: data.image_url, website_url: url, platforms, status: "ready", created_by: userId });
  }
  if (table === "tournaments") {
    const isResult = data.status === "completed" || data.status === "archived" || data.first_place_name || data.result_summary;
    const url = isResult ? `${site}/results` : `${site}/tournaments/${data.slug}`;
    const winner = data.first_place_name ? `Winner: ${data.first_place_name}` : "";
    const caption = `${data.title}\n\n${data.result_summary || data.description || "Tournament update from Auckland Knights Chess Club."}\n${winner ? `\n${winner}` : ""}\n\n${url}`;
    await s.from("social_posts").insert({ title: data.title, post_type: isResult ? "result" : "tournament", source_table: table, source_id: data.id, message: caption, image_url: data.winner_photo_url, website_url: url, platforms, status: "ready", created_by: userId });
  }
}

async function maybeCreateNewsFromSocial(s: any, table: string, data: any, clean: any, userId: string) {
  if (table !== "social_posts" || !clean.publish_as_news) return;
  const slugBase = String(data.title || "social-update").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const slug = `${slugBase}-${String(data.id).slice(0, 8)}`;
  await s.from("news_posts").insert({
    title: data.title,
    slug,
    summary: String(data.message || "").slice(0, 240),
    content: data.message,
    image_url: data.image_url,
    is_published: true,
    published_at: new Date().toISOString(),
    created_by: userId
  });
}

export async function POST(req: Request){
  const admin=await getCurrentAdmin();
  if(!admin) return NextResponse.json({error:'Not authorised'},{status:401});
  const {table,action,id,payload}=await req.json();
  if(!allowed.has(table)) return NextResponse.json({error:'Table not allowed'},{status:400});
  if(!canAccessTable(admin.profile.role, table)) return NextResponse.json({error:'Permission denied'},{status:403});
  const s=createSupabaseServiceClient();
  const clean:any={...payload, updated_at:new Date().toISOString()};

  if (table === "payment_accounts" && ['create','update'].includes(action)) {
    for (const key of Object.keys(clean)) if (!["name", "code", "account_number", "purpose", "is_active", "updated_at"].includes(key)) delete clean[key];
    for (const key of ["name", "code", "account_number", "purpose"]) clean[key] = String(clean[key] || "").trim();
    if (!clean.name || !clean.code || !clean.account_number || !clean.purpose || Object.values(clean).some(v => typeof v === "string" && v.length > 500)) return NextResponse.json({error:"Account name, code, number and purpose are required (maximum 500 characters each)."}, {status:400});
  }
  if (table === "tournaments" && clean.payment_account_id && ['create','update'].includes(action)) {
    const {data: account} = await s.from("payment_accounts").select("id,is_active").eq("id", clean.payment_account_id).maybeSingle();
    if (!account) return NextResponse.json({error:"Select an existing payment account."}, {status:400});
    if (!account.is_active) {
      const {data: existing} = await s.from("tournaments").select("payment_account_id").eq("id", id || "00000000-0000-0000-0000-000000000000").maybeSingle();
      if (existing?.payment_account_id !== account.id) return NextResponse.json({error:"Select an active payment account."}, {status:400});
    }
  }
  if (table === "club_settings") {
    // Only the dedicated numbering RPC can change these; stale settings forms cannot reset the counter.
    for (const field of ["membership_id_prefix", "membership_id_start", "membership_id_next", "membership_id_digits"]) delete clean[field];
  }
  Object.keys(clean).forEach(k=>{
    if(clean[k]==="") clean[k]=null;
    if(numericFields.has(k) && clean[k] !== null && clean[k] !== undefined) clean[k]=Number(clean[k]);
    if(booleanFields.has(k)) clean[k]=!!clean[k];
  });
  if(table==='news_posts' && clean.title && !clean.slug) clean.slug=slugify(clean.title);
  if(table==='news_posts' && clean.is_published && !clean.published_at) clean.published_at=new Date().toISOString();
  if(table==='tournaments' && (Object.prototype.hasOwnProperty.call(clean, 'rounds_display') || Object.prototype.hasOwnProperty.call(clean, 'rounds'))) clean.rounds = tournamentRounds(clean);
  if(table==='tournaments' && clean.title && !clean.slug) clean.slug=slugify(clean.title);
  if(table==='gallery_photos' && clean.is_published && !clean.event_date) clean.event_date=new Date().toISOString().slice(0,10);
  if(table==='social_posts' && clean.title && !clean.status) clean.status='draft';
  if(table==='live_board_links' && clean.title && !clean.status) clean.status='current';
  if(table==='membership_options' && ['create','update'].includes(action)) {
    if (!Number.isInteger(clean.fee_cents) || clean.fee_cents < 0 || clean.fee_cents > 10000000) return NextResponse.json({error:'Enter a valid membership fee between $0 and $100,000.'},{status:400});
    if (clean.validity_months != null && (!Number.isInteger(clean.validity_months) || clean.validity_months < 1 || clean.validity_months > 120)) return NextResponse.json({error:'Validity must be 1–120 months.'},{status:400});
    if (clean.valid_until_month != null && (!Number.isInteger(clean.valid_until_month) || clean.valid_until_month < 1 || clean.valid_until_month > 12)) return NextResponse.json({error:'Calendar end month must be 1–12, or blank for rolling validity.'},{status:400});
  }
  if(table==='membership_options' && clean.name && !clean.key) clean.key=slugify(clean.name).replace(/-/g,'_');
  if(table==='email_templates' && clean.name && !clean.template_key) clean.template_key=slugify(clean.name).replace(/-/g,'_');

  if (['agm_decisions', 'elected_team_members'].includes(table) && ['create', 'update'].includes(action)) {
    if (!clean.meeting_id) return NextResponse.json({error:'Select an AGM meeting'},{status:400});
    if (table === 'agm_decisions' && !clean.outcome) clean.outcome = 'Approved';
    if (table === 'elected_team_members' && clean.display_order == null) clean.display_order = 0;
  }

  if(action==='create'){
    if(table==='club_settings') clean.id='default';
    if(!['payment_accounts','membership_options','agm_decisions','elected_team_members'].includes(table)) clean.created_by=admin.user.id;
    const {data,error}=await s.from(table).insert(clean).select().single();
    if(error) return NextResponse.json({error:error.message},{status:400});
    await maybeCreateSocialDraft(s, table, data, clean, admin.user.id);
    await maybeCreateNewsFromSocial(s, table, data, clean, admin.user.id);
    return NextResponse.json({data});
  }
  if(action==='update'){
    const {data,error}=await s.from(table).update(clean).eq('id',id).select().single();
    if(error) return NextResponse.json({error:error.message},{status:400});
    await maybeCreateSocialDraft(s, table, data, clean, admin.user.id);
    await maybeCreateNewsFromSocial(s, table, data, clean, admin.user.id);
    return NextResponse.json({data});
  }
  if(action==='delete'){
    if (typeof id !== 'string' || !id.trim()) return NextResponse.json({error:'Select a record to delete.'},{status:400});
    const {data,error}=await s.from(table).delete().eq('id',id).select('id');
    if(error) return NextResponse.json({error:error.code === '23503' ? 'This record is referenced by another record. Remove that reference before deleting.' : error.message},{status:400});
    if (!data?.length) return NextResponse.json({error:'No record was deleted. Refresh the page and try again.'},{status:404});
    if (table === 'live_board_links') {
      revalidatePath('/live-boards');
      revalidatePath('/club-admin/live-boards');
    }
    return NextResponse.json({ok:true, deleted_id:id});
  }
  return NextResponse.json({error:'Invalid action'},{status:400});
}
