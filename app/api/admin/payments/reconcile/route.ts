import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { canAccess } from "@/lib/roles";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getStripe } from "@/lib/stripe";
import { confirmTournamentPayment, tryTournamentConfirmation } from "@/lib/tournamentPayment";
export async function POST(req: Request) {
  const admin = await getCurrentAdmin();
  if (!admin || !canAccess(admin.profile.role, "tournament_registrations")) return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  try {
    const { registration_id } = await req.json();
    const s = createSupabaseServiceClient();
    const { data: entry, error } = await s.from("tournament_registrations").select("*").eq("id", registration_id).single();
    if (error || !entry) throw new Error("Registration not found.");
    if (!entry.stripe_checkout_session_id) {
      if (entry.payment_status === "paid" && entry.registration_status === "confirmed" && Number(entry.entry_fee_cents) === 0) {
        const { data: tournament, error } = await s.from("tournaments").select("*").eq("id", entry.tournament_id).single();
        if (error) throw error;
        return NextResponse.json({ status: "confirmed", email_status: await tryTournamentConfirmation(s, entry, tournament) });
      }
      return NextResponse.json({ error: "No checkout session is linked. Check Stripe manually before confirming payment. Do not collect payment again without checking." }, { status: 400 });
    }
    const session = await getStripe().checkout.sessions.retrieve(entry.stripe_checkout_session_id);
    if (session.payment_status !== "paid" || session.status !== "complete") return NextResponse.json({ status: "not_paid", message: "Stripe has not confirmed payment. The entry remains unconfirmed." });
    return NextResponse.json(await confirmTournamentPayment(s, session));
  } catch (e: any) {
    console.error("Admin payment reconciliation failed", { registration_check_failed: true });
    return NextResponse.json({ error: "Payment could not be reconciled. Check the linked Stripe session, payment mode and Email Diagnostics. No new charge was made." }, { status: 400 });
  }
}
