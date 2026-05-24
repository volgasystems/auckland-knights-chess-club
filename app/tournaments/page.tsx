import PageShell from "@/components/PageShell";
import Link from "next/link";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { formatDate, formatMoney } from "@/lib/format";
import { displayRatingFormat, displayRatingType, displayTournamentSystem } from "@/lib/tournamentOptions";

function categories(t:any){ return Array.isArray(t.category_options) ? t.category_options : []; }
function feeLabel(t:any){ if (t.tournament_type === "club_calendar") return "Covered by active membership"; const cats = categories(t); if (cats.length) { const fees = cats.map((c:any)=>Number(c.fee_cents||0)).filter(Boolean); if (fees.length) return `From ${formatMoney(Math.min(...fees))}`; } return t.entry_fee_cents ? formatMoney(t.entry_fee_cents) : "Fee TBC"; }
function yearOf(t:any){ return Number(t.tournament_year || (t.start_date ? new Date(t.start_date).getFullYear() : new Date().getFullYear())); }

export default async function TournamentsPage() {
  const service = createSupabaseServiceClient();
  const { data: tournaments } = await service
    .from("tournaments")
    .select("*")
    .not("status", "in", "(completed,archived)")
    .order("start_date", { ascending: true });
  const byYear = new Map<number, any[]>();
  for (const t of tournaments || []) {
    const y = yearOf(t);
    byYear.set(y, [...(byYear.get(y)||[]), t]);
  }
  const years = Array.from(byYear.keys()).sort((a,b)=>b-a);

  return <PageShell><main className="container-page py-12">
    <div className="mx-auto max-w-5xl rounded-2xl bg-white p-8 shadow-soft">
      <h1 className="text-4xl font-extrabold">Tournaments</h1>
      <p className="mt-4 max-w-3xl text-lg leading-8 text-stone-700">Upcoming and current club tournaments and general/open events. Completed tournaments are moved to the Results page.</p>
      <p className="mt-2 text-stone-700">See also <Link href="/calendar" className="font-semibold underline">Calendar</Link> for the full yearly list.</p>

      <div className="mt-10 space-y-12">
        {years.map((year) => <section key={year}>
          <h2 className="mb-6 text-3xl font-extrabold">{year} Tournaments</h2>
          <div className="space-y-9">
            {(byYear.get(year)||[]).map((t:any)=><article key={t.id}>
              <h3 className="text-xl font-extrabold"><Link href={`/tournaments/${t.slug}`} className="hover:text-amber-700">{t.title}</Link> <span className="font-normal text-stone-700">{t.date_display ? `(${t.date_display})` : t.start_date ? `(${formatDate(t.start_date)})` : ""}</span></h3>
              {(t.rating_format || t.time_control || t.custom_time_control || t.rounds || t.tournament_system || t.tournament_format || t.rating_type) && <div className="mt-2 space-y-1 text-lg text-stone-800">
                <p>{displayRatingFormat(t)}{t.time_control || t.custom_time_control ? ` · ${t.time_control || t.custom_time_control}` : ""}</p>
                {t.rounds ? <p>{t.rounds} rounds</p> : null}
                <p>{displayTournamentSystem(t)} · {displayRatingType(t)}</p>
              </div>}
              <p className="text-lg text-stone-800">{t.lichess_url && <><a className="underline" target="_blank" rel="noreferrer" href={t.lichess_url}>Lichess broadcast</a></>}{t.pgn_url && <> – <a className="underline" target="_blank" rel="noreferrer" href={t.pgn_url}>PGN</a></>}{t.vega_url && <> – <a className="underline" target="_blank" rel="noreferrer" href={t.vega_url}>Vega</a></>}</p>
              <p className="mt-1 text-sm font-semibold text-stone-600">Registration: {feeLabel(t)}</p>
              {t.description && <p className="mt-2 max-w-3xl whitespace-pre-line text-stone-700">{t.description}</p>}
              <div className="mt-3 flex flex-wrap gap-3 text-sm">
                <Link href={`/tournaments/${t.slug}`} className="font-bold underline">Details</Link>
                {t.status === 'open' && t.allow_public_registration && <Link href={`/tournaments/${t.slug}/register`} className="font-bold text-amber-700 underline">{t.tournament_type === "club_calendar" ? "Enrol with Membership" : "Register & Pay"}</Link>}
                {t.show_public_entries && <Link href={`/tournaments/${t.slug}/entries`} className="font-bold underline">Entries</Link>}
              </div>
            </article>)}
          </div>
        </section>)}
        {years.length===0 && <div className="rounded-xl bg-stone-50 p-6 text-stone-600">No current or upcoming tournaments have been published yet.</div>}
      </div>
    </div>
  </main></PageShell>
}
