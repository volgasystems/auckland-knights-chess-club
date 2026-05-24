import PageShell from "@/components/PageShell";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { notFound } from "next/navigation";

export default async function EntriesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = createSupabaseServiceClient();
  const { data: tournament } = await service.from("tournaments").select("*").eq("slug", slug).maybeSingle();
  if (!tournament) notFound();
  const { data: entries } = await service.from("tournament_registrations").select("*").eq("tournament_id", tournament.id).eq("payment_status", "paid").eq("registration_status", "confirmed").order("created_at", { ascending: true });
  return <PageShell><main className="container-page py-12"><div className="card overflow-hidden"><div className="bg-akcc-blue p-6 text-white"><h1 className="text-3xl font-extrabold">{tournament.title} - Registered Players</h1><p className="text-blue-100">Only paid and confirmed entries are displayed publicly.</p></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-100 text-left"><tr>{["#","Player","Category","Club/School","NZCF","FIDE","Rating"].map(h=><th key={h} className="p-3">{h}</th>)}</tr></thead><tbody>{(entries || []).map((e:any,i:number)=><tr key={e.id} className="border-t"><td className="p-3">{i+1}</td><td className="p-3 font-bold">{e.first_name} {e.last_name}</td><td className="p-3">{e.category_name || "General"}</td><td className="p-3">{e.club_name || e.school_name || ""}</td><td className="p-3">{e.nzcf_id || ""}</td><td className="p-3">{e.fide_id || ""}</td><td className="p-3">{e.nzcf_rating || e.fide_rating || ""}</td></tr>)}</tbody></table></div></div></main></PageShell>
}
