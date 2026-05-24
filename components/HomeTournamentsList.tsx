"use client";
import Link from "next/link";
import { useState } from "react";
import { formatDate, formatMoney } from "@/lib/format";
import { displayRatingFormat, displayRatingType, displayTournamentSystem } from "@/lib/tournamentOptions";

export default function HomeTournamentsList({ tournaments }: { tournaments: any[] }) {
  const [visible, setVisible] = useState(3);
  const shown = tournaments.slice(0, visible);
  return (
    <div>
      <div className="grid gap-4">
        {shown.map((t:any)=>(
          <article key={t.id} className="card overflow-hidden sm:flex">
            {(t.tournament_image_url || t.image_url) ? (
              <img src={t.tournament_image_url || t.image_url} alt="" className="h-40 w-full object-cover sm:h-auto sm:w-56 sm:shrink-0" />
            ) : null}
            <div className="flex-1 p-5">
              <p className="text-xs font-bold text-black">{formatDate(t.start_date)}</p>
              <h3 className="mt-2 text-lg font-extrabold">{t.title}</h3>
              <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-stone-700">
                <span>{displayRatingFormat(t)}</span>
                <span>•</span>
                <span>{t.time_control || t.custom_time_control || "Time TBC"}</span>
                <span>•</span>
                <span>{displayTournamentSystem(t)}</span>
                <span>•</span>
                <span>{displayRatingType(t)}</span>
              </div>
              <p className="mt-2 text-sm text-stone-600">{t.venue_name || t.venue || "Venue TBC"}</p>
              <p className="mt-2 text-sm font-bold">{t.entry_fee_cents ? formatMoney(t.entry_fee_cents) : "Fee TBC"}</p>
              <Link href={`/tournaments/${t.slug}`} className="btn-primary mt-4 py-2">View Details</Link>
            </div>
          </article>
        ))}
      </div>
      {tournaments.length > visible && (
        <button type="button" onClick={() => setVisible((v) => v + 3)} className="btn-secondary mt-5 w-full sm:w-auto">
          Load More Tournaments
        </button>
      )}
    </div>
  );
}
