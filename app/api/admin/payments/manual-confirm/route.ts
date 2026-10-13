import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentAdmin } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getStripe } from "@/lib/stripe";
import { confirmTournamentPayment, tryTournamentConfirmation } from "@/lib/tournamentPayment";
import { reconcileTournamentRefund } from "@/lib/tournamentRefund";
import { paymentConfiguration } from "@/lib/paymentConfig";

export async function POST(req: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Session expired. Please sign in again." }, { status: 401 });
  if (!["admin", "super_admin"].includes(admin.profile.role)) return NextResponse.json({ error: "Admin or Super Admin approval is required." }, { status: 403 });
  try {
    const { registration_id, method, note, received } = await req.json();
    if (typeof registration_id !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(registration_id) || !["cash", "bank_transfer", "verified_other"].includes(method) || typeof note !== "string" || note.trim().length < 5 || note.trim().length > 500 || received !== true) {
      return NextResponse.json({ error: "Select the payment method, enter a reference or note (5–500 characters), and confirm that the full entry fee was received." }, { status: 400 });
    }
    const s = createSupabaseServiceClient();
    const { data: entry, error } = await s.from("tournament_registrations").select("*").eq("id", registration_id).single();
    if (error || !entry) return NextResponse.json({ error: "Registration not found." }, { status: 404 });
    if (entry.payment_status === "refunded" || entry.registration_status === "cancelled") return NextResponse.json({ error: "Refunded or cancelled entries cannot be confirmed." }, { status: 409 });
    const { data: tournament, error: eventError } = await s.from("tournaments").select("*").eq("id", entry.tournament_id).single();
    if (eventError || !tournament) throw new Error("Event unavailable");
    // A replay of a completed manual approval only retries its confirmation email.
    if (entry.payment_status === "paid") {
      const { data: receipt } = await s.from("payment_records").select("payment_method,status").eq("id", entry.id).maybeSingle();
      if (!["cash", "bank_transfer", "verified_other"].includes(receipt?.payment_method) || receipt?.status !== "paid" || entry.registration_status !== "confirmed") return NextResponse.json({ error: "This entry is already paid. Use Check payment to verify Stripe." }, { status: 409 });
      return NextResponse.json({ status: "confirmed", email_status: await tryTournamentConfirmation(s, entry, tournament) });
    }
    // Check the migration before expiring an existing checkout.
    const setup = await s.from("payment_records").select("payment_method,confirmed_by,confirmation_note,confirmed_at").limit(1);
    if (setup.error) return NextResponse.json({ error: "Manual payment approval needs the database update: run 20261013_manual_tournament_payments.sql in Supabase, then try again." }, { status: 503 });
    if (entry.stripe_checkout_session_id) {
      const stripe = getStripe();
      const session = await stripe.checkout.sessions.retrieve(entry.stripe_checkout_session_id);
      const config = paymentConfiguration();
      if (session.metadata?.type !== "tournament_registration" || session.metadata.registration_id !== entry.id || session.metadata.tournament_id !== entry.tournament_id || session.currency !== "nzd" || session.amount_total !== Number(entry.entry_fee_cents) || ((config.production || config.mode === "live") && !session.livemode) || (config.mode === "test" && session.livemode)) throw new Error("Checkout mismatch");
      const refund = await reconcileTournamentRefund(s, session, entry);
      if (refund) return NextResponse.json({ error: "Stripe shows a refund. Entry cancelled; manual approval was not applied." }, { status: 409 });
      if (session.payment_status === "paid" && session.status === "complete") {
        const result = await confirmTournamentPayment(s, session);
        refresh();
        return NextResponse.json({ ...result, message: "Stripe payment verified. Entry confirmed using the existing Stripe payment." });
      }
      if (session.status === "complete" || session.payment_status !== "unpaid") return NextResponse.json({ error: "Stripe checkout may be processing. Resolve it in Stripe before recording an offline payment." }, { status: 409 });
      // Prevent the old payment link from collecting a second entry fee.
      if (session.status === "open") await stripe.checkout.sessions.expire(session.id);
    }
    const result = await s.rpc("confirm_manual_tournament_payment", { p_registration_id: entry.id, p_admin_id: admin.user.id, p_method: method, p_note: note.trim(), p_expected_updated_at: entry.updated_at });
    if (result.error) {
      if (result.error.code === "PGRST202" || result.error.code === "42883") return NextResponse.json({ error: "Manual payment approval needs the database update: run 20261013_manual_tournament_payments.sql in Supabase, then try again." }, { status: 503 });
      return NextResponse.json({ error: "Entry could not be confirmed. It may have changed or already have a payment record. Refresh and verify before trying again." }, { status: 409 });
    }
    refresh();
    return NextResponse.json({ status: "confirmed", email_status: await tryTournamentConfirmation(s, result.data, tournament), message: "Payment recorded and entry confirmed." });
  } catch {
    return NextResponse.json({ error: "Unable to confirm payment. Check the entry and linked Stripe checkout. No payment was collected." }, { status: 400 });
  }
}
function refresh() {
  for (const path of ["/club-admin/tournament-registrations", "/club-admin/tournament-registrations/players", "/club-admin/dashboard", "/club-admin/reports"]) revalidatePath(path);
  revalidatePath("/tournaments", "layout");
}
