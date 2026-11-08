import { withPublishedAwards } from "@/lib/inauguralPrizewinners";
export const dynamic = "force-dynamic";
import PageShell from "@/components/PageShell";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { formatDate } from "@/lib/format";
import { displayRatingFormat, displayRatingType, displayTournamentSystem } from "@/lib/tournamentOptions";

function yearOf(t:any){ return Number(t.tournament_year || (t.start_date ? new Date(t.start_date).getFullYear() : new Date().getFullYear())); }

export default async function ResultsPage() {
  const service = createSupabaseServiceClient();
  const { data } = await service
    .from("tournaments")
    .select("*")
    .or("status.in.(completed,archived),winner_photo_url.not.is.null,first_place_name.not.is.null,vega_url.not.is.null,result_summary.not.is.null")
    .order("start_date", { ascending: false });
  const byYear = new Map<number, any[]>();
  for (const record of data || []) {
    const t = withPublishedAwards(record);
    const y = yearOf(t);
    byYear.set(y, [...(byYear.get(y)||[]), t]);
  }
  const years = Array.from(byYear.keys()).sort((a,b)=>b-a);

  return <PageShell><main className="container-page py-12">
    <div className="mx-auto max-w-5xl rounded-2xl bg-white p-8 shadow-soft">
      <h1 className="text-4xl font-extrabold">Results</h1>
      <p className="mt-4 max-w-3xl text-lg leading-8 text-stone-700">Completed and past tournament results, winner details, Vega links and PGN/broadcast links.</p>

      <div className="mt-10 space-y-12">
        {years.map((year, index)=><section key={year}>
          <h2 className="mb-6 text-3xl font-extrabold">{index === 0 ? `${year} Results` : `Previous tournaments of ${year}`}</h2>
          <div className="space-y-9">
            {(byYear.get(year)||[]).map((t:any)=><article key={t.id} className="border-b border-stone-200 pb-8 last:border-b-0">
              {t.slug === "AKCC1" && <figure className="mb-6 overflow-hidden rounded-2xl border border-amber-200 bg-slate-950 shadow-lg"><img src="/images/akcc-rapid-open-2026-trophies-enhanced.webp" alt="Enhanced event photograph of Auckland Knights Chess Club trophies and medals at the Inaugural Rapid Open 2026" className="h-auto w-full"/><figcaption className="px-5 py-4 text-white"><p className="text-xs font-semibold uppercase tracking-widest text-amber-300">7 November 2026 · Howick, Auckland</p><p className="mt-1 text-xl font-bold">Auckland Knights Inaugural Rapid Open 2026</p><p className="mt-1 text-sm text-slate-200">Celebrating our prizewinners</p></figcaption></figure>}
              {t.winner_photo_url && <img src={t.winner_photo_url} alt={`${t.title} winner`} className="mb-5 max-h-[420px] w-full rounded-2xl object-cover"/>}
              <h3 className="text-xl font-extrabold">{t.title} <span className="font-normal text-stone-700">{t.date_display ? `(${t.date_display})` : t.start_date ? `(${formatDate(t.start_date)})` : ""}</span></h3>
              <div className="mt-4 mb-5 overflow-hidden rounded-xl border border-slate-200"><table className="w-full text-left text-sm"><tbody>{[
                ["Date",t.date_display || (t.start_date ? formatDate(t.start_date) : "—")],
                ["Format",displayRatingFormat(t)],
                ["Time control",t.time_control || t.custom_time_control || "—"],
                ["Rounds",t.rounds || "—"],
                ["System",displayTournamentSystem(t)],
                ["Rating",displayRatingType(t)],
              ].map(([label,value],i)=><tr key={label} className={i%2 ? "bg-slate-100" : "bg-white"}><th scope="row" className="w-40 px-4 py-3 font-semibold">{label}</th><td className="px-4 py-3">{value}</td></tr>)}
              {t.vega_url && <tr className="border-t"><th scope="row" className="px-4 py-3">Results</th><td className="px-4 py-3"><a className="underline" target="_blank" rel="noreferrer" href={t.vega_url}>View Vega standings</a></td></tr>}
              <tr className="border-t"><th scope="row" className="px-4 py-3">Photos</th><td className="px-4 py-3"><a className="underline" href="/photo-gallery">View event photo albums</a></td></tr>
              {t.lichess_url && <tr className="border-t"><th scope="row" className="px-4 py-3">Broadcast</th><td className="px-4 py-3"><a className="underline" target="_blank" rel="noreferrer" href={t.lichess_url}>Lichess broadcast</a></td></tr>}
              {t.pgn_url && <tr className="border-t"><th scope="row" className="px-4 py-3">Games</th><td className="px-4 py-3"><a className="underline" target="_blank" rel="noreferrer" href={t.pgn_url}>PGN</a></td></tr>}
              </tbody></table></div>
              <p className="mt-3 whitespace-pre-line text-stone-700">{t.result_summary || t.description || "Result details will be published soon."}</p>
              {Array.isArray(t.tournament_prizes) && t.tournament_prizes.some((p:any)=>p.winner_name) ? <div className="mt-5 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-amber-100"><tr><th className="p-3">Category</th><th className="p-3">Award</th><th className="p-3">Prizewinner</th><th className="p-3">Points / rounds</th></tr></thead><tbody>{t.tournament_prizes.filter((p:any)=>p.winner_name).map((p:any,i:number)=><tr key={i} className={i%2 ? "bg-slate-100" : "bg-white"}><td className="p-3">{p.category}</td><td className="p-3">{p.position}</td><td className="p-3 font-semibold">{/^https?:\/\//i.test(p.profile_url || "") ? <a className="underline" href={p.profile_url} target="_blank" rel="noreferrer">{p.winner_name}</a> : p.winner_name}</td><td className="p-3">{p.points !== null && p.points !== undefined && p.points !== "" ? `${p.points}/${t.rounds || "—"}` : "—"}</td></tr>)}</tbody></table></div> : <div className="mt-4 grid gap-1 text-sm text-stone-800">
                <p><b>1st:</b> {t.first_place_name || "TBC"}</p>
                <p><b>2nd:</b> {t.second_place_name || "TBC"}</p>
                <p><b>3rd:</b> {t.third_place_name || "TBC"}</p>
                {t.prize_details && <p><b>Prize:</b> {t.prize_details}</p>}
              </div>}
            </article>)}
          </div>
        </section>)}
        {years.length===0 && <div className="rounded-xl bg-stone-50 p-6 text-stone-600">No results have been published yet.</div>}
      </div>
    </div>
  </main></PageShell>
}
