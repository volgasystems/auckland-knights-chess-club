import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { canAccess } from "@/lib/roles";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { formatMoney } from "@/lib/format";
import { dashboardAnalytics, dashboardRange, dashboardRows } from "@/lib/dashboardAnalytics";
import DashboardCharts from "@/components/admin/DashboardCharts";
export const dynamic = "force-dynamic";
export default async function Dashboard({searchParams}:{searchParams:Promise<{days?:string;tournament_id?:string}>}) {
 const admin=await requireAdmin("dashboard"),s=createSupabaseServiceClient(),sp=await searchParams;
 const allowed=(area:Parameters<typeof canAccess>[1])=>canAccess(admin.profile.role,area);
 const days=dashboardRange(sp.days),showMembers=allowed("members"),showRegistrations=allowed("tournament_registrations"),showPayments=allowed("payments");
 const tasks:[string,PromiseLike<any>][]=[];
 if(showMembers)tasks.push(["members",dashboardRows(s,"club_memberships",`id,created_at,payment_status${showPayments?",total_amount_cents":""}`)]);
 if(showRegistrations)tasks.push(["entries",dashboardRows(s,"tournament_registrations",`id,created_at,tournament_id,payment_status,registration_status${showPayments?",entry_fee_cents":""}`)]);
 if(showPayments)tasks.push(["payments",dashboardRows(s,"payment_records","id,reference_id,created_at,payment_type,status,amount_cents")]);
 for(const [name,table,area] of [["news","news_posts","news"],["events","tournaments","tournaments"],["accounts","payment_accounts","payment_accounts"],["absences","absences","absences"]] as const){if(allowed(area))tasks.push([name,Promise.resolve(s.from(table).select("id",{count:"exact",head:true})).then(r=>{if(r.error)throw new Error(name);return r.count;})]);}
 if(showRegistrations)tasks.push(["tournaments",Promise.resolve(s.from("tournaments").select("id,title").order("title")).then(r=>{if(r.error)throw new Error("tournaments");return r.data||[];})]);
 const results=await Promise.allSettled(tasks.map(([,task])=>task)),values:Record<string,any>={},failures:string[]=[];
 results.forEach((r,i)=>{const name=tasks[i][0];if(r.status==="fulfilled")values[name]=r.value;else failures.push(name);});
 const tournaments=values.tournaments||[],tournamentId=tournaments.some((t:any)=>t.id===sp.tournament_id)?sp.tournament_id!:"";
 const members=values.members||[],entries=values.entries||[],payments=values.payments||[];
 const data=dashboardAnalytics(members,entries,payments,days,tournamentId);
 const cards:{label:string;value:string|number;href:string;color:string}[]=[];
 function add(label:string,key:string,href:string,color:string){if(tasks.some(([n])=>n===key))cards.push({label,value:values[key]??"Unavailable",href,color});}
 add("News Items","news","/club-admin/news","border-sky-400 from-sky-50");add("Events","events","/club-admin/tournaments","border-violet-400 from-violet-50");add("Payment Accounts","accounts","/club-admin/accounts","border-cyan-400 from-cyan-50");
 if(showMembers)cards.push({label:"Total Members",value:values.members?members.length:"Unavailable",href:"/club-admin/members",color:"border-purple-400 from-purple-50"});
 if(showRegistrations)cards.push({label:"Tournament Registrations",value:values.entries?entries.length:"Unavailable",href:"/club-admin/tournament-registrations",color:"border-blue-400 from-blue-50"});
 add("Absence Reports","absences","/club-admin/absences","border-rose-400 from-rose-50");
 const paidSum=(rows:any[],field:string)=>rows.filter(r=>["paid","manual_paid"].includes(r.payment_status)).reduce((n,r)=>n+Number(r[field]||0),0);
 if(showPayments){cards.push({label:"Membership Payments",value:values.members?formatMoney(paidSum(members,"total_amount_cents")):"Unavailable",href:"/club-admin/members",color:"border-emerald-400 from-emerald-50"},{label:"Tournament Payments",value:values.entries?formatMoney(paidSum(entries,"entry_fee_cents")):"Unavailable",href:"/club-admin/tournament-registrations",color:"border-amber-400 from-amber-50"});}
 return <div>
  <div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-extrabold">Dashboard</h1><p className="mt-2 text-sm text-slate-500">Club activity, registration growth and payment insights.</p></div><p className="text-xs text-slate-500">Updated {new Date().toLocaleString("en-NZ",{timeZone:"Pacific/Auckland"})} NZ time</p></div>
  <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({label,value,href,color})=><Link key={label} href={href} className={`block rounded-2xl border border-slate-200 border-t-4 bg-gradient-to-br ${color} to-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-500`}><p className="text-sm font-semibold text-slate-500">{label}</p><p className="mt-2 text-2xl font-extrabold text-slate-900">{value}</p><p className="mt-3 text-xs text-slate-400">Current records · View details →</p></Link>)}</div>
  {failures.length>0&&<p role="alert" className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Some dashboard data could not be loaded ({failures.join(", ")}). Unavailable charts are hidden. Refresh to try again.</p>}
  {(showMembers||showRegistrations||showPayments)&&<><form className="mt-7 flex flex-wrap items-end gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><label className="text-sm font-bold text-slate-700">Chart period<select className="admin-input mt-2 min-w-36" name="days" defaultValue={days}><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></select></label>{showRegistrations&&<label className="min-w-48 flex-1 text-sm font-bold text-slate-700">Tournament<select className="admin-input mt-2 w-full" name="tournament_id" defaultValue={tournamentId}><option value="">All tournaments</option>{tournaments.map((t:any)=><option key={t.id} value={t.id}>{t.title}</option>)}</select></label>}<button className="btn-primary">Update charts</button><p className="w-full text-xs text-slate-500">{data.start} to {data.today}, inclusive · New Zealand time. The cards above show all retained records.</p></form><DashboardCharts data={data} showMembers={showMembers&&!failures.includes("members")} showRegistrations={showRegistrations&&!failures.includes("entries")} showPayments={showPayments&&!failures.includes("payments")&&!failures.includes("entries")} filtered={!!tournamentId}/></>}
 </div>;
}
