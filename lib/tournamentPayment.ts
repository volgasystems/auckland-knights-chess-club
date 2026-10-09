import { createHash } from "node:crypto";
import { sendEmail } from "@/lib/email";
import { paymentConfiguration } from "@/lib/paymentConfig";

function check(result: any) { if (result.error) throw new Error(result.error.message); return result.data; }
function escapeHtml(value: any) { return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)); }

export function validateTournamentPayment(session: any, registration: any) {
  if (session.mode !== "payment" || session.status !== "complete" || session.payment_status !== "paid") throw new Error("Payment is not completed.");
  const config = paymentConfiguration();
  if ((config.production || config.mode === "live") && !session.livemode) throw new Error("Test payment cannot confirm a live entry.");
  if (config.mode === "test" && session.livemode) throw new Error("Payment mode mismatch.");
  if (session.metadata?.type !== "tournament_registration" || session.metadata.registration_id !== registration.id || session.metadata.tournament_id !== registration.tournament_id) throw new Error("Payment registration mismatch.");
  if (registration.stripe_checkout_session_id && registration.stripe_checkout_session_id !== session.id) throw new Error("Checkout session mismatch.");
  if (session.currency !== "nzd" || session.amount_total !== Number(registration.entry_fee_cents) || Number(registration.entry_fee_cents) <= 0) throw new Error("Payment amount or currency mismatch.");
  if (registration.payment_status === "refunded" || registration.registration_status === "cancelled") throw new Error("This registration needs administrator review.");
}

// One durable email log per entry; its primary key also claims concurrent sends.
export async function sendTournamentConfirmation(s: any, registration: any, tournament: any, outcome: "confirmed" | "failed" = "confirmed") {
  const hash = createHash("sha256").update(`tournament-payment-failed:${registration.id}`).digest("hex");
  const logId = outcome === "confirmed" ? registration.id : `${hash.slice(0,8)}-${hash.slice(8,12)}-${hash.slice(12,16)}-${hash.slice(16,20)}-${hash.slice(20,32)}`;
  const now = new Date().toISOString();
  const log = { id: logId, recipient_email: registration.email, recipient_name: `${registration.first_name} ${registration.last_name}`, status: "queued", created_at: now, error_message: null };
  const inserted = await s.from("email_delivery_logs").insert(log);
  if (inserted.error) {
    if (inserted.error.code !== "23505") throw new Error(inserted.error.message);
    const existing = check(await s.from("email_delivery_logs").select("*").eq("id", logId).single());
    if (existing.status === "sent") return "sent";
    if (existing.status === "queued" && Date.now() - new Date(existing.created_at).getTime() < 120000) return "pending";
    const claimed = check(await s.from("email_delivery_logs").update({ status: "queued", created_at: now, error_message: null }).eq("id", logId).eq("status", existing.status).eq("created_at", existing.created_at).select("id").maybeSingle());
    if (!claimed) return "pending";
  }
  try {
    const confirmationText = `Hello ${registration.first_name},\n\nYour entry for ${tournament.title} is confirmed.\n\nPlayer: ${registration.first_name} ${registration.last_name}\nCategory: ${registration.category_name || "General Entry"}\nEntry fee: NZ$${(Number(registration.entry_fee_cents || 0) / 100).toFixed(2)}\nReference: ${registration.id}\n${tournament.start_date ? `Date: ${tournament.start_date}\n` : ""}${tournament.venue ? `Venue: ${tournament.venue}\n` : ""}\nView tournaments: ${paymentConfiguration().siteUrl || "https://www.aucklandknights.co.nz"}/tournaments\n\nFor help, contact info@aucklandknights.co.nz.\n\nAuckland Knights Chess Club`;
    const text = outcome === "confirmed" ? confirmationText : `Hello ${registration.first_name},\n\nStripe reported that payment for ${tournament.title} was unsuccessful. Your entry is not confirmed.\n\nReference: ${registration.id}\n\nIf your bank shows a payment, do not pay again. Contact info@aucklandknights.co.nz with this reference so we can check it.\n\nAuckland Knights Chess Club`;
    await sendEmail({ to: registration.email, subject: `${outcome === "confirmed" ? "Entry confirmed" : "Payment unsuccessful"} — ${tournament.title}`, text, html: `<div style="font-family:Arial,sans-serif;white-space:pre-wrap">${escapeHtml(text)}</div>` });
    check(await s.from("email_delivery_logs").update({ status: "sent", sent_at: new Date().toISOString(), error_message: null }).eq("id", logId));
    return "sent";
  } catch (error: any) {
    check(await s.from("email_delivery_logs").update({ status: "failed", error_message: "Confirmation email could not be sent. Check Email Diagnostics and retry." }).eq("id", logId));
    console.error("Tournament confirmation email failed", { registration_id: registration.id });
    return "failed";
  }
}

export async function confirmTournamentPayment(s: any, session: any) {
  const id = session.metadata?.registration_id;
  if (!id) throw new Error("Registration reference missing.");
  const existing = check(await s.from("tournament_registrations").select("*").eq("id", id).single());
  validateTournamentPayment(session, existing);
  const paymentIntent = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id || "";
  const registration = check(await s.from("tournament_registrations").update({ payment_status: "paid", registration_status: "confirmed", stripe_checkout_session_id: session.id, stripe_payment_intent_id: paymentIntent, updated_at: new Date().toISOString() }).eq("id", id).in("payment_status", ["pending_payment", "failed", "expired", "paid"]).neq("registration_status", "cancelled").select("*").single());
  // Existing schema primary keys provide retry safety without a database migration.
  const existingRecord = check(await s.from("payment_records").select("id").eq("stripe_checkout_session_id", session.id).limit(1).maybeSingle());
  if (!existingRecord) check(await s.from("payment_records").upsert({ id, payment_type: "tournament", reference_id: id, email: registration.email, amount_cents: session.amount_total, status: "paid", stripe_checkout_session_id: session.id, stripe_payment_intent_id: paymentIntent }, { onConflict: "id", ignoreDuplicates: true }));
  const tournament = check(await s.from("tournaments").select("*").eq("id", registration.tournament_id).single());
  const emailStatus = await tryTournamentConfirmation(s, registration, tournament);
  return { registration_id: id, status: "confirmed", email_status: emailStatus };
}

export async function tryTournamentConfirmation(s: any, registration: any, tournament: any, outcome: "confirmed" | "failed" = "confirmed") {
  try { return await sendTournamentConfirmation(s, registration, tournament, outcome); }
  catch { console.error("Tournament email tracking failed", { registration_id: registration.id }); return "failed"; }
}
