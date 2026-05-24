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
  for (const t of data || []) {
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
              {t.winner_photo_url && <img src={t.winner_photo_url} alt={`${t.title} winner`} className="mb-5 max-h-[420px] w-full rounded-2xl object-cover"/>}
              <h3 className="text-xl font-extrabold">{t.title} <span className="font-normal text-stone-700">{t.date_display ? `(${t.date_display})` : t.start_date ? `(${formatDate(t.start_date)})` : ""}</span></h3>
              {(t.rating_format || t.time_control || t.custom_time_control || t.rounds || t.tournament_system || t.tournament_format || t.rating_type) && <div className="mt-2 space-y-1 text-lg text-stone-800">
                <p>{displayRatingFormat(t)}{t.time_control || t.custom_time_control ? ` · ${t.time_control || t.custom_time_control}` : ""}</p>
                {t.rounds ? <p>{t.rounds} rounds</p> : null}
                <p>{displayTournamentSystem(t)} · {displayRatingType(t)}</p>
              </div>}
              <p className="text-lg text-stone-800">{t.lichess_url && <><a className="underline" target="_blank" rel="noreferrer" href={t.lichess_url}>Lichess broadcast</a></>}{t.pgn_url && <> – <a className="underline" target="_blank" rel="noreferrer" href={t.pgn_url}>PGN</a></>}{t.vega_url && <> – <a className="underline" target="_blank" rel="noreferrer" href={t.vega_url}>Vega page</a></>}</p>
              <p className="mt-3 whitespace-pre-line text-stone-700">{t.result_summary || t.description || "Result details will be published soon."}</p>
              <div className="mt-4 grid gap-1 text-sm text-stone-800">
                <p><b>1st:</b> {t.first_place_name || "TBC"}</p>
                <p><b>2nd:</b> {t.second_place_name || "TBC"}</p>
                <p><b>3rd:</b> {t.third_place_name || "TBC"}</p>
                {t.prize_details && <p><b>Prize:</b> {t.prize_details}</p>}
              </div>
            </article>)}
          </div>
        </section>)}
        {years.length===0 && <div className="rounded-xl bg-stone-50 p-6 text-stone-600">No results have been published yet.</div>}
      </div>
    </div>
  </main></PageShell>
}
