import { confirmMembershipRenewal } from "@/lib/membershipRenewal";
import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { confirmMembershipPayment } from "@/lib/membershipPayment";
import { confirmTournamentPayment, tryTournamentConfirmation } from "@/lib/tournamentPayment";
import { paymentConfiguration } from "@/lib/paymentConfig";

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Payment confirmation is unavailable" }, { status: 503 });
  if (!sig) return NextResponse.json({ error: "Webhook signature required" }, { status: 400 });
  let event: any;
  try { event = getStripe().webhooks.constructEvent(await req.text(), sig, secret); }
  catch { return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 }); }
  try {
    const s = createSupabaseServiceClient();
    const session = event.data.object as any;
    const type = session.metadata?.type;
    const successful = ["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(event.type);
    if (successful && session.payment_status === "paid") {
      if (paymentConfiguration().production && !session.livemode) throw new Error("Test payment received in production");
      if (type === "tournament_registration") {
        const result = await confirmTournamentPayment(s, session);
        if (result.email_status !== "sent") throw new Error("Confirmation email pending; retry delivery");
      }
      if (type === "membership_renewal") {
        const result = await confirmMembershipRenewal(s, session);
        if (result.email_status !== "sent") throw new Error("Renewal email pending; retry delivery");
      }
      if (type === "membership") {
        const result = await confirmMembershipPayment(s, session);
        if (result.email_status !== "sent") throw new Error("Membership email pending; retry delivery");
      }
    }
    if (["checkout.session.expired", "checkout.session.async_payment_failed"].includes(event.type)) {
      const expired = event.type === "checkout.session.expired";
      if (type === "tournament_registration") {
        const { data: entry, error } = await s.from("tournament_registrations").update({ payment_status: expired ? "expired" : "failed", registration_status: expired ? "expired" : "pending_payment", updated_at: new Date().toISOString() }).eq("id", session.metadata.registration_id).eq("stripe_checkout_session_id", session.id).in("payment_status", ["pending_payment", "failed"]).select("*").maybeSingle();
        if (error) throw error;
        if (entry && !expired) {
          const { data: tournament, error } = await s.from("tournaments").select("*").eq("id", entry.tournament_id).single();
          if (error) throw error;
          if (await tryTournamentConfirmation(s, entry, tournament, "failed") !== "sent") throw new Error("Failure email pending; retry delivery");
        }
      }
      if (type === "membership_renewal") {
        const { error } = await s.from("membership_renewals").update({ status: expired ? "expired" : "failed" }).eq("id", session.metadata.renewal_id).eq("stripe_checkout_session_id", session.id).eq("status", "pending_payment");
        if (error) throw error;
      }
      if (type === "membership" && expired) {
        const { error } = await s.from("club_memberships").update({ payment_status: "expired", membership_status: "expired" }).eq("id", session.metadata.membership_id).eq("payment_status", "pending_payment");
        if (error) throw error;
      }
    }
    return NextResponse.json({ received: true });
  } catch {
    console.error("Stripe event processing failed", { event_id: event.id, event_type: event.type });
    // Stripe retries failures instead of silently losing paid entries or emails.
    return NextResponse.json({ error: "Payment confirmation could not be completed; retry required" }, { status: 503 });
  }
}
