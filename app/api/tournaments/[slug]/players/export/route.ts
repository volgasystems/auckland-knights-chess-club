import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { playerFideTitle, fideProfileUrl } from "@/lib/publicPlayerDisplay";
import { sortPublicPlayers } from "@/lib/publicPlayerSorting";
import { publicPlayersWorkbook } from "@/lib/publicPlayersExcel";
export const runtime = "nodejs";
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const s = createSupabaseServiceClient();
    const { data: tournament, error } = await s.from("tournaments").select("id,title").eq("slug", slug).maybeSingle();
    if (error) throw error;
    if (!tournament) return NextResponse.json({ error: "Tournament not found." }, { status: 404 });
    // Public export deliberately excludes contacts, DOB and payment references.
    const result = await s.from("tournament_registrations").select("first_name,last_name,gender,fide_id,fide_rating,nzcf_rating,club_name,school_name").eq("tournament_id", tournament.id).eq("payment_status", "paid").eq("registration_status", "confirmed").order("created_at", { ascending: true });
    if (result.error) throw result.error;
    const players = sortPublicPlayers(result.data || [], new URL(req.url).searchParams.get("sort"));
    const ids = [...new Set<string>(players.map((p: any) => String(p.fide_id || "").trim()).filter(id => fideProfileUrl(id)))];
    const titles = Object.fromEntries(await Promise.all(ids.map(async id => [id, await playerFideTitle(id)])));
    const buffer = await publicPlayersWorkbook(tournament.title, players, titles);
    const filename = `${slug.replace(/[^a-z0-9_-]/gi, "_").slice(0, 80) || "tournament"}-registered-players.xlsx`;
    return new NextResponse(new Uint8Array(buffer), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "Unable to export players. Please try again." }, { status: 503 }); }
}
