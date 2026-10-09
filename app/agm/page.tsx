export const dynamic = "force-dynamic";

import MeetingSummary from "@/components/MeetingSummary";
import PageShell from "@/components/PageShell";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { formatDate } from "@/lib/format";
export default async function AGMPage(){
  const service=createSupabaseServiceClient();
  const {data:meetings}=await service.from("agm_meetings").select("*").eq("is_published",true).order("meeting_date",{ascending:false});
  const ids=(meetings||[]).map((m:any)=>m.id);
  const {data:decisions}=ids.length?await service.from("agm_decisions").select("*").in("meeting_id",ids):{data:[] as any[]};
  const {data:team}=ids.length?await service.from("elected_team_members").select("*").in("meeting_id",ids).order("display_order",{ascending:true}):{data:[] as any[]};
  return <PageShell><main className="container-page py-12"><h1 className="text-4xl font-extrabold">AGM & Club Notices</h1><div className="mt-8 space-y-8">{(meetings||[]).map((m:any)=><article key={m.id} className="card p-6"><p className="text-sm font-bold text-akcc-blue">{formatDate(m.meeting_date)}</p><h2 className="mt-2 text-2xl font-extrabold">{m.title}</h2><MeetingSummary text={m.summary} /><div className="mt-6 grid gap-6 md:grid-cols-2"><section><h3 className="font-bold">Decisions Made</h3><ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">{(decisions||[]).filter((d:any)=>d.meeting_id===m.id).map((d:any)=><li key={d.id}><b>{d.title}:</b> {d.description} <span className="font-semibold">({d.outcome})</span></li>)}</ul></section><section><h3 className="font-bold">Elected Team</h3><div className="mt-3 space-y-2 text-sm">{(team||[]).filter((t:any)=>t.meeting_id===m.id).map((t:any)=><p key={t.id}><b>{t.role_title}:</b> {t.person_name}</p>)}</div></section></div></article>)}</div></main></PageShell>
}
