import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { sendEmail } from "@/lib/email";
import { confirmTournamentPayment, tryTournamentConfirmation } from "@/lib/tournamentPayment";
import { paymentConfiguration } from "@/lib/paymentConfig";

function endOfCurrentMembershipYear() {
  const now = new Date();
  const end = new Date(Date.UTC(now.getUTCFullYear(), 11, 31));
  return end.toISOString().slice(0, 10);
}
function todayISO() { return new Date().toISOString().slice(0, 10); }
function render(template: string, values: Record<string, any>) {
  return String(template || "").replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key) => String(values[key] ?? ""));
}

async function sendMembershipConfirmation(s: any, membership: any) {
  try {
    const { data: tmpl } = await s.from("email_templates").select("*").eq("template_key", "membership_confirmation").eq("is_active", true).maybeSingle();
    if (!tmpl) return;
    const values = {
      first_name: membership.first_name,
      last_name: membership.last_name,
      full_name: `${membership.first_name || ""} ${membership.last_name || ""}`.trim(),
      email: membership.email,
      membership_id: membership.membership_id,
      membership_start_date: membership.membership_start_date,
      membership_end_date: membership.membership_end_date,
      club_name: "Auckland Knights Chess Club",
    };
    await sendEmail({ to: membership.email, subject: render(tmpl.subject, values), html: `<pre style="font-family:Arial,sans-serif;white-space:pre-wrap">${render(tmpl.body, values)}</pre>` });
  } catch {}
}

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
      if (type === "membership") {
        const id = session.metadata?.membership_id;
        const { data: existing, error: lookupError } = await s.from("club_memberships").select("*").eq("id", id).single();
        if (lookupError) throw lookupError;
        let membershipId = existing.membership_id;
        if (!membershipId) {
          const { data: generated, error } = await s.rpc("generate_membership_id");
          if (error) throw error;
          membershipId = generated;
        }
        const { data: updated, error } = await s.from("club_memberships").update({
          payment_status: "paid", membership_status: "active", membership_id: membershipId,
          membership_start_date: existing.membership_start_date || todayISO(),
          membership_end_date: existing.membership_end_date || endOfCurrentMembershipYear(),
          stripe_payment_intent_id: String(session.payment_intent || ""), updated_at: new Date().toISOString()
        }).eq("id", id).select("*").single();
        if (error) throw error;
        const { data: existingRecord, error: recordLookupError } = await s.from("payment_records").select("id").eq("stripe_checkout_session_id", session.id).limit(1).maybeSingle();
        if (recordLookupError) throw recordLookupError;
        const { error: recordError } = existingRecord ? { error: null } : await s.from("payment_records").upsert({ id, payment_type: "membership", reference_id: id, email: session.customer_email, amount_cents: session.amount_total, status: "paid", stripe_checkout_session_id: session.id, stripe_payment_intent_id: String(session.payment_intent || "") }, { onConflict: "id", ignoreDuplicates: true });
        if (recordError) throw recordError;
        if (existing.payment_status !== "paid") await sendMembershipConfirmation(s, updated);
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
