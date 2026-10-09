import MeetingSummary from "@/components/MeetingSummary";
import PageShell from "@/components/PageShell";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { formatDate } from "@/lib/format";
export default async function CoachingPage(){
  const service=createSupabaseServiceClient();
  const {data:coaches}=await service.from("coaches").select("*").eq("is_published",true).order("display_order",{ascending:true});
  const {data:topics}=await service.from("coaching_topics").select("*").eq("is_published",true).order("topic_date",{ascending:true});
  return <PageShell><main className="container-page py-12"><h1 className="text-4xl font-extrabold">Coaching</h1><p className="mt-3 text-slate-600">Club coaching, online coaching options and weekly topics.</p><h2 className="mt-10 text-2xl font-extrabold">Coaches</h2><div className="mt-5 grid gap-6 md:grid-cols-3">{(coaches||[]).map((c:any)=>{ const photo = c.image_url || c.photo_url; return <article key={c.id} className="card overflow-hidden">{photo && <img src={photo} alt={c.name} className="h-56 w-full object-cover"/>}<div className="p-5"><h3 className="text-xl font-bold">{c.name}</h3><p className="text-sm font-semibold text-akcc-blue">{c.title}</p><MeetingSummary text={c.bio}/><p className="mt-3 text-sm"><b>Specialisation:</b> {c.specialisation}</p>{c.booking_link && <a className="btn-primary mt-4 py-2" href={c.booking_link} target="_blank">Join / Book</a>}</div></article>})}</div><h2 className="mt-12 text-2xl font-extrabold">Weekly Coaching Topics</h2><div className="mt-5 grid gap-4 md:grid-cols-2">{(topics||[]).map((t:any)=><article key={t.id} className="card p-5"><p className="text-xs font-bold text-akcc-blue">{formatDate(t.topic_date)} • {t.skill_level}</p><h3 className="mt-2 text-lg font-bold">{t.title}</h3><MeetingSummary text={t.description}/>{t.join_link && <a className="btn-secondary mt-4 py-2" href={t.join_link} target="_blank">Online Join Link</a>}</article>)}</div></main></PageShell>
}
