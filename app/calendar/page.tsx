// Tournament data is managed in admin and must be read on every request.
export const dynamic = "force-dynamic";

import PageShell from "@/components/PageShell";
import Link from "next/link";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { formatMoney } from "@/lib/format";
import { displayRatingFormat, displayRatingType, displayTournamentSystem } from "@/lib/tournamentOptions";

function dateLabel(t: any) {
  if (t.date_display) return t.date_display;
  if (!t.start_date) return "Date TBC";
  const d = new Date(t.start_date);
  return d.toLocaleDateString("en-NZ", { month: "short", day: "numeric" });
}
function yearOf(t: any) {
  return Number(t.tournament_year || (t.start_date ? new Date(t.start_date).getFullYear() : new Date().getFullYear()));
}
function registrationText(t: any) {
  if (t.tournament_type === "club_calendar") return "Membership event — enrol online with active Membership ID";
  const fee = Number(t.entry_fee_cents || 0);
  return `General/Open tournament — separate payment${fee ? ` from ${formatMoney(fee)}` : ""}`;
}
function eventLink(t: any) {
  return t.slug ? `/tournaments/${t.slug}` : "/tournaments";
}

export default async function CalendarPage(){
  const s=createSupabaseServiceClient();
  const [{data:settings}, {data}]=await Promise.all([
    s.from("club_settings").select("calendar_title,calendar_description").eq("id","default").maybeSingle(),
    s.from("tournaments").select("*").eq("show_in_calendar", true).not("status","eq","archived").order("start_date",{ascending:true})
  ]);
  const byYear = new Map<number, any[]>();
  for (const t of data || []) {
    const y = yearOf(t);
    byYear.set(y, [...(byYear.get(y)||[]), t]);
  }
  const years = Array.from(byYear.keys()).sort((a,b)=>b-a);
  const firstYear = years[0] || new Date().getFullYear();
  const pageTitle = "Calendar";
  const rawCalendarTitle = settings?.calendar_title?.trim();
  const configuredYearTitle = rawCalendarTitle && rawCalendarTitle.toLowerCase() !== "calendar" ? rawCalendarTitle : `${firstYear} Calendar`;
  const description = settings?.calendar_description?.trim() || "Yearly calendar of club events and general/open tournaments. Club calendar events are covered by active membership. General/open tournaments require separate payment.";

  return <PageShell><main className="container-page py-12">
    <div className="mx-auto max-w-5xl rounded-2xl bg-white p-8 shadow-soft">
      <h1 className="text-4xl font-extrabold tracking-tight">{pageTitle}</h1>
      <p className="mt-5 max-w-3xl whitespace-pre-line text-lg leading-8 text-stone-700">{description}</p>
      <p className="mt-4 text-sm text-stone-600">Calendar items link to the configured tournament details where available.</p>

      <div className="mt-10 space-y-12">
        {years.map(year => <section key={year}>
          <h2 className="mb-5 text-2xl font-extrabold">{year === firstYear ? configuredYearTitle : `${year} Calendar`}</h2>
          <div className="divide-y divide-stone-200 border-y border-stone-200">
            {(byYear.get(year)||[]).map((t:any)=>{
              const isClosed = ["closed", "completed", "archived"].includes(t.status);
              return <div key={t.id} className="grid gap-3 py-4 md:grid-cols-[95px,1fr]">
                <div className="font-mono text-lg text-stone-700">{dateLabel(t)}</div>
                <div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    {isClosed && t.status === "closed" ? <span className="font-bold">Closed</span> : <Link href={eventLink(t)} className="font-semibold underline decoration-stone-400 underline-offset-4 hover:text-amber-700">{t.title}</Link>}
                    {t.status !== "closed" && <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-bold uppercase text-stone-700">{t.status}</span>}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-stone-700">
                    {t.rating_format && <span>{displayRatingFormat(t)}</span>}
                    {(t.time_control || t.custom_time_control) && <span>{t.time_control || t.custom_time_control}</span>}
                    {t.rounds ? <span>{t.rounds} rounds</span> : null}
                    {(t.tournament_system || t.tournament_format) && <span>{displayTournamentSystem(t)}</span>}
                    {t.rating_type && <span>{displayRatingType(t)}</span>}
                    {t.venue_name && <span>{t.venue_name}</span>}
                  </div>
                  {t.description && <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">{t.description}</p>}
                  <p className="mt-2 text-xs font-semibold text-stone-500">{registrationText(t)}</p>
                  <div className="mt-2 flex flex-wrap gap-3 text-sm">
                    {t.status === "open" && (t.allow_public_registration || t.tournament_type === "club_calendar") && <Link href={`/tournaments/${t.slug}/register`} className="font-bold text-amber-700 underline">{t.tournament_type === "club_calendar" ? "Enrol" : "Register"}</Link>}
                    {t.lichess_url && <a href={t.lichess_url} target="_blank" rel="noreferrer" className="underline">Lichess broadcast</a>}
                    {t.vega_url && <a href={t.vega_url} target="_blank" rel="noreferrer" className="underline">Vega page</a>}
                    {t.pgn_url && <a href={t.pgn_url} target="_blank" rel="noreferrer" className="underline">PGN</a>}
                  </div>
                </div>
              </div>})}
          </div>
        </section>)}
        {years.length===0 && <div className="rounded-xl bg-stone-50 p-6 text-stone-600">No calendar items are published yet.</div>}
      </div>
    </div>
  </main></PageShell>;
}
