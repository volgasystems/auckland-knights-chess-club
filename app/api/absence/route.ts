import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { sendEmail } from "@/lib/email";

export async function POST(req: Request) {
  const body = await req.json();
  if (!body.player_first_name || !body.player_last_name || !body.email || !body.tournament_name || !body.round_number || !body.round_date || !body.reason) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const s = createSupabaseServiceClient();
  const { data, error } = await s.from("absences").insert({
    player_first_name: body.player_first_name,
    player_last_name: body.player_last_name,
    parent_guardian_name: body.parent_guardian_name,
    email: body.email,
    phone: body.phone,
    tournament_name: body.tournament_name,
    round_number: body.round_number,
    round_date: body.round_date,
    reason: body.reason,
    notes: body.notes,
    status: "new",
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  let email_warning = "";
  try {
    const { data: settings } = await s.from("club_settings").select("*").eq("id", "default").maybeSingle();
    const to = settings?.senior_club_captain_email || settings?.club_captain_email || settings?.general_email;
    if (to) {
      await sendEmail({
        to,
        subject: `Absence Notification - Round ${body.round_number} - ${body.player_first_name} ${body.player_last_name}`,
        html: `<h2>Absence Report</h2><p><b>Player:</b> ${body.player_first_name} ${body.player_last_name}</p><p><b>Tournament:</b> ${body.tournament_name}</p><p><b>Round:</b> ${body.round_number}</p><p><b>Round Date:</b> ${body.round_date}</p><p><b>Reason:</b> ${body.reason}</p><p><b>Email:</b> ${body.email}</p><p><b>Phone:</b> ${body.phone || ""}</p>`,
      });
    }
  } catch (e: any) {
    email_warning = e.message || "Absence saved, but email notification could not be sent.";
  }

  return NextResponse.json({ ok: true, data, email_warning });
}
