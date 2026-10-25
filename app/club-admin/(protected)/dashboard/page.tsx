import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { canAccess } from "@/lib/roles";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { dashboardRange, dashboardRows } from "@/lib/dashboardAnalytics";
import { dashboardOverview } from "@/lib/dashboardOverview";
import DashboardCharts from "@/components/admin/DashboardCharts";
export const dynamic = "force-dynamic";
export default async function Dashboard({searchParams}:{searchParams:Promise<{days?:string;tournament_id?:string;view?:string}>}) {
 const admin=await requireAdmin("dashboard"),s=createSupabaseServiceClient(),sp=await searchParams;
 const allowed=(area:Parameters<typeof canAccess>[1])=>canAccess(admin.profile.role,area);
 const permissions={members:allowed("members"),entries:allowed("tournament_registrations"),payments:allowed("payments"),events:allowed("tournaments"),enquiries:allowed("enquiries"),absences:allowed("absences")};
 const tasks:[string,PromiseLike<any>][]=[];
 if(permissions.members)tasks.push(["members",dashboardRows(s,"club_memberships","id,created_at,payment_status,membership_status,membership_end_date")]);
 if(permissions.entries)tasks.push(["entries",dashboardRows(s,"tournament_registrations","id,created_at,tournament_id,payment_status,registration_status")]);
 if(permissions.payments)tasks.push(["payments",dashboardRows(s,"payment_records","id,reference_id,created_at,payment_type,status,amount_cents")]);
 if(permissions.events||permissions.entries||permissions.absences)tasks.push(["events",dashboardRows(s,"tournaments","id,title,slug,created_at,start_date,status,tournament_type")]);
 if(permissions.enquiries)tasks.push(["enquiries",dashboardRows(s,"contact_enquiries","id,created_at,status,enquiry_type,subject")]);
 if(permissions.absences)tasks.push(["absences",dashboardRows(s,"absences","id,created_at,tournament_name,round_number,round_date,status,player_first_name,player_last_name,email")]);
 for(const [name,table,area] of [["news","news_posts","news"],["accounts","payment_accounts","payment_accounts"]] as const)if(allowed(area))tasks.push([name,Promise.resolve(s.from(table).select("id",{count:"exact",head:true})).then(r=>{if(r.error)throw new Error(name);return r.count;})]);
 const results=await Promise.allSettled(tasks.map(([,task])=>task)),values:Record<string,any>={},failures:string[]=[];
 results.forEach((r,i)=>{const name=tasks[i][0];if(r.status==="fulfilled")values[name]=r.value;else failures.push(name);});
 const tournaments=values.events||[],tournamentId=tournaments.some((t:any)=>t.id===sp.tournament_id)?sp.tournament_id!:"";
 const data=dashboardOverview({members:values.members||[],entries:values.entries||[],payments:values.payments||[],events:tournaments,enquiries:values.enquiries||[],absences:values.absences||[]},dashboardRange(sp.days),tournamentId);
 const visibility={members:permissions.members&&!failures.includes("members"),entries:permissions.entries&&!failures.includes("entries"),payments:permissions.payments&&!failures.includes("payments")&&(!tournamentId||!failures.includes("entries")),events:permissions.events&&!failures.includes("events"),enquiries:permissions.enquiries&&!failures.includes("enquiries"),absences:permissions.absences&&!failures.includes("absences")};
 return <div>
  <div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-extrabold">Dashboard</h1><p className="mt-2 text-sm text-slate-500">Membership, tournament registrations, payments, events, enquiries and absences — each with its own view.</p></div><p className="text-xs text-slate-500">Updated {new Date().toLocaleString("en-NZ",{timeZone:"Pacific/Auckland"})} NZ time</p></div>
  {failures.length>0&&<p role="alert" className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Some dashboard data could not be loaded ({failures.join(", ")}). Affected sections are hidden rather than shown as zero. Refresh to try again.</p>}
  <DashboardCharts key={`${data.days}-${tournamentId}-${sp.view||"overview"}`} data={data} visibility={visibility} tournaments={tournaments.map((t:any)=>({id:t.id,title:t.title}))} selectedId={tournamentId} initialView={sp.view}/>
  {(allowed("news")||allowed("payment_accounts"))&&<div className="mt-6 flex flex-wrap gap-4 text-sm">{allowed("news")&&<Link href="/club-admin/news" className="rounded-lg border bg-white px-4 py-3 font-semibold">News items: {values.news??"Unavailable"} →</Link>}{allowed("payment_accounts")&&<Link href="/club-admin/accounts" className="rounded-lg border bg-white px-4 py-3 font-semibold">Payment accounts: {values.accounts??"Unavailable"} →</Link>}</div>}
 </div>;
}
