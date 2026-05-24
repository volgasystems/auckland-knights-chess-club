import PageShell from "@/components/PageShell";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

function LinkRow({ item }: { item: any }) {
  return <article className="card p-5"><h2 className="text-xl font-extrabold">{item.title}</h2><p className="mt-1 text-sm text-slate-600">{item.date_display || item.tournament_name || item.year}</p><div className="mt-4 flex flex-wrap gap-2">{item.vega_url && <a href={item.vega_url} target="_blank" rel="noreferrer" className="btn-secondary py-2">Vega page</a>}{item.lichess_url && <a href={item.lichess_url} target="_blank" rel="noreferrer" className="btn-secondary py-2">Lichess broadcast</a>}</div></article>;
}

export default async function LiveBoardsPage() {
  const service = createSupabaseServiceClient();
  const { data } = await service.from("live_board_links").select("*").eq("is_published", true).order("display_order", { ascending: true }).order("created_at", { ascending: false });
  const current = (data || []).filter((x:any)=>x.status === 'current');
  const recent = (data || []).filter((x:any)=>x.status !== 'current');
  const main = current[0];
  return <PageShell><main className="container-page py-12"><h1 className="text-4xl font-extrabold">Live Boards <span className="text-2xl text-slate-500">(when available)</span></h1><p className="mt-3 max-w-3xl text-slate-700">Below are current and recent Lichess broadcast links and Vega pages maintained by Auckland Knights Chess Club.</p>{main && <section className="card mt-8 overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 bg-akcc-blue px-5 py-4 text-white"><div><h2 className="font-bold">{main.title}</h2><p className="text-sm text-blue-100">{main.date_display || main.tournament_name}</p></div><div className="flex gap-2">{main.vega_url && <a href={main.vega_url} target="_blank" rel="noreferrer" className="rounded-md bg-white px-4 py-2 text-sm font-bold text-akcc-blue">Vega page</a>}{main.lichess_url && <a href={main.lichess_url} target="_blank" rel="noreferrer" className="rounded-md bg-white px-4 py-2 text-sm font-bold text-akcc-blue">Lichess broadcast</a>}</div></div>{main.embed_url ? <iframe src={main.embed_url} title={main.title} className="h-[620px] w-full border-0 bg-white" /> : <div className="flex min-h-80 items-center justify-center bg-slate-100 text-slate-500">Live board embed not available. Please use the links above.</div>}</section>}{recent.length > 0 && <section className="mt-10"><h2 className="mb-4 text-2xl font-extrabold">Recently / History</h2><div className="space-y-4">{recent.map((item:any)=><LinkRow key={item.id} item={item}/>)}</div></section>}{(!data || data.length===0) && <div className="card mt-8 p-6 text-slate-600">No live board links have been published yet.</div>}</main></PageShell>;
}
