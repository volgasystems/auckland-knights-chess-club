import { revalidatePath } from "next/cache";
import { getStripe } from "@/lib/stripe";
import { paymentConfiguration } from "@/lib/paymentConfig";

export function isFullTournamentRefund(charge: any) {
  return charge.paid === true && charge.refunded === true && Number(charge.amount) > 0 && Number(charge.amount_refunded) >= Number(charge.amount);
}

export async function applyTournamentRefund(s: any, charge: any, entry?: any) {
  if (!isFullTournamentRefund(charge)) return null;
  const config = paymentConfiguration();
  if ((config.production || config.mode === "live") && !charge.livemode) throw new Error("Refund mode mismatch.");
  if (config.mode === "test" && charge.livemode) throw new Error("Refund mode mismatch.");
  const intent = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  if (!intent) return null;
  if (!entry) {
    const result = await s.from("tournament_registrations").select("*").eq("stripe_payment_intent_id", intent).maybeSingle();
    if (result.error) throw result.error;
    entry = result.data;
  }
  if (!entry) return null;
  if (entry.stripe_payment_intent_id && entry.stripe_payment_intent_id !== intent) throw new Error("Refund entry mismatch.");
  if (charge.currency !== "nzd" || Number(charge.amount) !== Number(entry.entry_fee_cents)) throw new Error("Refund amount mismatch.");
  const update = await s.from("tournament_registrations").update({ payment_status: "refunded", registration_status: "cancelled", stripe_payment_intent_id: intent, updated_at: new Date().toISOString() }).eq("id", entry.id).select("id").single();
  if (update.error) throw update.error;
  const record = await s.from("payment_records").update({ status: "refunded" }).eq("reference_id", entry.id).eq("payment_type", "tournament");
  if (record.error) throw record.error;
  revalidatePath("/club-admin/tournament-registrations");
  revalidatePath("/club-admin/tournament-registrations/players");
  revalidatePath("/club-admin/dashboard");
  revalidatePath("/club-admin/reports");
  revalidatePath("/tournaments", "layout");
  return { registration_id: entry.id, status: "refunded", message: "Stripe confirms a full refund. Entry cancelled and removed from confirmed players. Payment history retained." };
}

export async function reconcileTournamentRefund(s: any, session: any, entry: any) {
  if (session.metadata?.type !== "tournament_registration" || session.metadata.registration_id !== entry.id || session.metadata.tournament_id !== entry.tournament_id || session.id !== entry.stripe_checkout_session_id) throw new Error("Checkout entry mismatch.");
  const intent = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
  if (!intent) return null;
  const charges = await getStripe().charges.list({ payment_intent: intent, limit: 100 });
  const full = charges.data.find(isFullTournamentRefund);
  return full ? applyTournamentRefund(s, full, entry) : null;
}
