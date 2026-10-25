import { createHmac, timingSafeEqual, createHash } from "node:crypto";
import { getStripe } from "@/lib/stripe";
import { confirmTournamentPayment } from "@/lib/tournamentPayment";
import { reconcileTournamentRefund } from "@/lib/tournamentRefund";
import { paymentConfiguration } from "@/lib/paymentConfig";
import { sendEmail } from "@/lib/email";
import { emailTextHtml } from "@/lib/emailTemplate";

const DAY = 86400000;
export function paymentDeadline(t: any) {
  const start = Date.parse(t.start_date || "");
  if (!Number.isFinite(start)) return NaN; // Never guess a tournament's deadline.
  const close = Date.parse(t.registration_close_at || "");
  return Number.isFinite(close) ? Math.min(start, close) : start;
}
export function unpaidEntry(r: any) { return ["pending_payment", "failed", "expired"].includes(r.payment_status) && ["pending_payment", "expired"].includes(r.registration_status); }
export function paymentOpen(t: any, now = Date.now()) {
  return t.status === "open" && t.allow_public_registration && paymentDeadline(t) > now && (!t.registration_open_at || Date.parse(t.registration_open_at) <= now);
}
export function reminderStage(r: any, t: any, now = Date.now()) {
  if (r.payment_method === "bank_transfer") return null;
  if (t.payment_reminders_enabled !== true || !paymentOpen(t, now) || !unpaidEntry(r)) return null;
  const age = now - Date.parse(r.created_at), last = Date.parse(r.payment_reminder_sent_at || ""), claimed = Date.parse(r.payment_reminder_claimed_at || "");
  if (Number.isFinite(claimed) && now - claimed < DAY) return null;
  if (!Number.isFinite(age) || age < DAY || (Number.isFinite(last) && now - last < DAY)) return null;
  if (paymentDeadline(t) - now <= DAY) return "final";
  if (Number.isFinite(last) && now - last < 3 * DAY) return null;
  return `day-${Math.floor((age - DAY) / (3 * DAY))}`;
}
export function paymentResumeToken(id: string, expires: number) {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Payment link signing unavailable.");
  return `${id}.${expires}.${createHmac("sha256", secret).update(`tournament-payment-resume:${id}:${expires}`).digest("hex")}`;
}
export function verifyPaymentResumeToken(token: string, now = Date.now()) {
  const [id, exp, signature, extra] = String(token || "").split(".");
  if (extra || !/^[0-9a-f-]{36}$/i.test(id || "") || !/^\d+$/.test(exp || "") || !/^[0-9a-f]{64}$/.test(signature || "") || Number(exp) <= now) return null;
  const expected = paymentResumeToken(id, Number(exp)).split(".")[2];
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected)) ? id : null;
}
export function paymentResumeUrl(r: any, t: any) {
  const token = paymentResumeToken(r.id, paymentDeadline(t));
  return `${paymentConfiguration().siteUrl}/payment/tournament-resume?token=${encodeURIComponent(token)}`;
}
export function stripePaymentReason(session: any) {
  if (session.payment_status === "paid") return "Stripe reports payment received; confirmation is being checked.";
  if (session.status === "complete") return "Stripe checkout completed, but payment is still processing. Do not pay again.";
  if (session.status === "expired") return "The Stripe checkout link expired before payment was completed.";
  const intent = typeof session.payment_intent === "object" ? session.payment_intent : null;
  if (intent?.last_payment_error) return "Stripe reports an unsuccessful payment attempt. Your bank or payment provider can explain any decline.";
  return "Checkout has not been completed. Stripe has not confirmed payment; the exact reason is not available.";
}
function checked(result: any) { if (result.error) throw new Error(result.error.message); return result.data; }
// Verify linked Stripe state before reminders or reopening a checkout. Paid entries are never asked to pay twice.
export async function inspectEntryPayment(s: any, r: any) {
  if (!r.stripe_checkout_session_id) return { state: "review", reason: "No Stripe checkout is linked. Contact the club before paying again.", session: null };
  const session: any = await getStripe().checkout.sessions.retrieve(r.stripe_checkout_session_id, { expand: ["payment_intent"] });
  const config = paymentConfiguration();
  if (session.metadata?.registration_id !== r.id || session.metadata?.tournament_id !== r.tournament_id || session.metadata?.type !== "tournament_registration" || session.mode !== "payment" || session.currency !== "nzd" || session.amount_total !== Number(r.entry_fee_cents) || (config.mode === "live" && !session.livemode) || (config.mode === "test" && session.livemode)) throw new Error("Checkout needs administrator review.");
  const refund = await reconcileTournamentRefund(s, session, r);
  if (refund) return { state: "refunded", reason: "This payment has been refunded.", session };
  if (session.payment_status === "paid" && session.status === "complete") {
    await confirmTournamentPayment(s, session);
    return { state: "paid", reason: "Payment received. Your entry is confirmed.", session };
  }
  if (session.status === "complete" || ["processing","succeeded"].includes(session.payment_intent?.status)) return { state: "processing", reason: "Your payment is processing or awaiting confirmation. Do not pay again; contact the club if it remains pending.", session };
  return { state: "unpaid", reason: stripePaymentReason(session), session };
}
export async function runPaymentReminders(s: any, tournamentId?: string, now = Date.now()) {
  // Preflight before any email: a missing migration must fail safely.
  checked(await s.from("tournament_registrations").select("payment_reminder_sent_at,payment_reminder_claimed_at,payment_pending_reason").limit(1));
  let activeQuery = s.from("tournaments").select("id").eq("status","open").eq("payment_reminders_enabled",true).gte("start_date",new Date(now).toISOString());
  if (tournamentId) activeQuery = activeQuery.eq("id",tournamentId);
  const activeIds = (checked(await activeQuery) || []).map((t:any)=>t.id);
  if (!activeIds.length) return {sent:0,failed:0,skipped:0,reconciled:0,checked:0};
  let query = s.from("tournament_registrations").select("*, tournaments(*)").in("tournament_id",activeIds).in("payment_status", ["pending_payment", "failed", "expired"]).order("payment_reminder_sent_at", { ascending: true, nullsFirst: true }).order("created_at").limit(1000);
  if (tournamentId) query = query.eq("tournament_id", tournamentId);
  const rows = checked(await query) || [];
  const stats = { sent: 0, failed: 0, skipped: 0, reconciled: 0, checked: 0 };
  const started = Date.now();
  for (const row of rows) {
    if (stats.sent + stats.failed >= 100 || Date.now() - started > 240000) break;
    const t = row.tournaments, stage = t && reminderStage(row, t, now);
    if (!stage) { stats.skipped++; continue; }
    stats.checked++;
    try {
      const result = await inspectEntryPayment(s, row);
      checked(await s.from("tournament_registrations").update({ payment_pending_reason: result.reason }).eq("id", row.id));
      if (result.state !== "unpaid") { if (result.state === "paid" || result.state === "refunded") stats.reconciled++; else stats.skipped++; continue; }
      // Suppress duplicate paid players even if an abandoned checkout used another email.
      let duplicates = s.from("tournament_registrations").select("id").eq("tournament_id", row.tournament_id).eq("payment_status", "paid").eq("registration_status", "confirmed").ilike("first_name", String(row.first_name).replace(/[\\%_]/g,"\\$&")).ilike("last_name", String(row.last_name).replace(/[\\%_]/g,"\\$&")).eq("date_of_birth", row.date_of_birth);
      if ((checked(await duplicates) || []).length) { stats.skipped++; continue; }
      if (t.max_players) { const capacity = await s.from("tournament_registrations").select("id", { count: "exact", head: true }).eq("tournament_id", t.id).eq("payment_status", "paid").eq("registration_status", "confirmed"); checked(capacity); if (capacity.count >= t.max_players) { stats.skipped++; continue; } }
      // Compare-and-set claims the entry across scheduler/manual runs and stage boundaries.
      let claim = s.from("tournament_registrations").update({payment_reminder_claimed_at:new Date().toISOString()}).eq("id",row.id).in("payment_status",["pending_payment","failed","expired"]).in("registration_status",["pending_payment","expired"]);
      claim = row.payment_reminder_claimed_at ? claim.eq("payment_reminder_claimed_at",row.payment_reminder_claimed_at) : claim.is("payment_reminder_claimed_at",null);
      if (!checked(await claim.select("id").maybeSingle())) { stats.skipped++; continue; }
      const hash = createHash("sha256").update(`payment-reminder:${row.id}:${stage}`).digest("hex");
      const logId = `${hash.slice(0,8)}-${hash.slice(8,12)}-${hash.slice(12,16)}-${hash.slice(16,20)}-${hash.slice(20,32)}`;
      const log = await s.from("email_delivery_logs").insert({ id: logId, recipient_email: row.email, recipient_name: `${row.first_name} ${row.last_name}`, status: "queued" });
      if (log.error?.code === "23505") { stats.skipped++; continue; } // No blind retries after an ambiguous send.
      checked(log);
      try {
        const fresh = checked(await s.from("tournament_registrations").select("*").eq("id", row.id).single());
        const currentTournament = checked(await s.from("tournaments").select("*").eq("id", t.id).single());
        if (!reminderStage({...fresh,payment_reminder_claimed_at:null}, currentTournament, Date.now())) { checked(await s.from("email_delivery_logs").update({status:"skipped"}).eq("id",logId)); stats.skipped++; continue; }
        const deadline = new Date(paymentDeadline(currentTournament)).toLocaleString("en-NZ", { timeZone: "Pacific/Auckland" });
        const text = `Hello ${row.first_name},\n\n${stage === "final" ? "Final payment reminder" : "Payment reminder"} for ${currentTournament.title}.\n\nPlayer: ${row.first_name} ${row.last_name}\nReference: ${row.id}\nEntry fee: NZ$${(Number(row.entry_fee_cents)/100).toFixed(2)}\nStatus: Not confirmed — payment outstanding.\nReason: ${result.reason}\nPlease complete payment before ${deadline} (New Zealand time), subject to places remaining.\n\nContinue payment for your existing entry (do not register again):\n${paymentResumeUrl(row, currentTournament)}\n\nIf your bank shows a payment, do not pay again. Contact akcc.nzchess@gmail.com or 022 179 3499 with your reference. If you no longer wish to play, reply to request cancellation and stop reminders.\n\nAuckland Knights Chess Club`;
        await sendEmail({ to: row.email, subject: `${stage === "final" ? "Final payment reminder" : "Payment reminder"} — ${currentTournament.title}`, text, html: emailTextHtml(text) });
        checked(await s.from("email_delivery_logs").update({status:"sent",sent_at:new Date().toISOString()}).eq("id",logId));
        checked(await s.from("tournament_registrations").update({ payment_reminder_sent_at:new Date().toISOString() }).eq("id",row.id));
        stats.sent++;
      } catch {
        await s.from("email_delivery_logs").update({status:"failed",error_message:"Payment reminder delivery or tracking failed. Review Email Diagnostics before resending."}).eq("id",logId);
        stats.failed++;
      }
    } catch {
      await s.from("tournament_registrations").update({payment_pending_reason:"Stripe/payment verification could not be completed. Administrator review required before paying again."}).eq("id",row.id);
      stats.failed++;
    }
  }
  return stats;
}
