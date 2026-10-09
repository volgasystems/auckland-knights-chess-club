import { sendEmail } from "@/lib/email";
import { paymentConfiguration } from "@/lib/paymentConfig";
function checked(result: any) { if (result.error) throw result.error; return result.data; }
function escapeHtml(v: any) { return String(v ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!)); }
export async function assignMembershipId(s: any, member: any) {
  if (member.membership_id) return member.membership_id;
  const result = await s.rpc("assign_membership_id", { p_member_id: member.id });
  if (!result.error) return result.data;
  // Keep the deployed legacy sequence working until the database upgrade is applied.
  if (!["PGRST202", "42883"].includes(result.error.code)) throw result.error;
  for (let attempt = 0; attempt < 10; attempt++) {
    const generated = checked(await s.rpc("generate_membership_id"));
    if (!generated) throw new Error("Membership ID generator returned no ID");
    const update = await s.from("club_memberships").update({ membership_id: generated, updated_at: new Date().toISOString() }).eq("id", member.id).is("membership_id", null).select("membership_id").maybeSingle();
    if (update.error?.code === "23505") continue;
    if (update.error) throw update.error;
    if (update.data) return update.data.membership_id;
    const current = checked(await s.from("club_memberships").select("membership_id").eq("id", member.id).single());
    if (current.membership_id) return current.membership_id;
  }
  throw new Error("Unable to allocate a unique membership ID");
}
export async function sendMembershipConfirmation(s: any, member: any) {
  const now = new Date().toISOString();
  const claim = await s.from("email_delivery_logs").insert({ id: member.id, recipient_email: member.email, recipient_name: `${member.first_name} ${member.last_name}`, status: "queued", created_at: now });
  if (claim.error) {
    if (claim.error.code !== "23505") throw claim.error;
    const existing = checked(await s.from("email_delivery_logs").select("*").eq("id", member.id).single());
    if (existing.status === "sent") return "sent";
    if (existing.status === "queued" && Date.now() - new Date(existing.created_at).getTime() < 120000) return "pending";
    const locked = checked(await s.from("email_delivery_logs").update({ status: "queued", created_at: now, error_message: null }).eq("id", member.id).eq("status", existing.status).eq("created_at", existing.created_at).select("id").maybeSingle());
    if (!locked) return "pending";
  }
  try {
    const { data: template, error } = await s.from("email_templates").select("subject,body").eq("template_key", "membership_confirmation").eq("is_active", true).maybeSingle();
    if (error) throw error;
    const values: any = { ...member, full_name: `${member.first_name} ${member.last_name}`, club_name: "Auckland Knights Chess Club" };
    const render = (v: string) => v.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key) => String(values[key] ?? ""));
    const subject = template?.subject ? render(template.subject) : "Auckland Knights membership confirmed";
    const text = template?.body ? render(template.body) : `Hello ${member.first_name},\n\nYour Auckland Knights Chess Club membership status is ${member.membership_status}.\nMembership ID: ${member.membership_id}\nValid from: ${member.membership_start_date}\nValid until: ${member.membership_end_date}\n\nUse your membership ID or registered email for club events.\nFor help, contact info@aucklandknights.co.nz.\n\nAuckland Knights Chess Club`;
    await sendEmail({ to: member.email, subject, text, html: `<div style="font-family:Arial,sans-serif;white-space:pre-wrap">${escapeHtml(text)}</div>` });
    checked(await s.from("email_delivery_logs").update({ status: "sent", sent_at: new Date().toISOString(), error_message: null }).eq("id", member.id));
    return "sent";
  } catch {
    checked(await s.from("email_delivery_logs").update({ status: "failed", error_message: "Membership email failed. Check Email Diagnostics and retry." }).eq("id", member.id));
    return "failed";
  }
}
export async function activateMembership(s: any, member: any) {
  if (!["paid", "manual_paid", "waived"].includes(member.payment_status)) throw new Error("Payment is not confirmed");
  const membershipId = await assignMembershipId(s, member);
  const parts = new Intl.DateTimeFormat("en", { timeZone: "Pacific/Auckland", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const dateParts = Object.fromEntries(parts.map(p=>[p.type,p.value]));
  const today = `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
  const year = dateParts.year;
  const endDate = member.membership_end_date || `${year}-12-31`;
  const membershipStatus = endDate < today ? "expired" : "active";
  const updated = checked(await s.from("club_memberships").update({ membership_id: membershipId, membership_status: membershipStatus, membership_start_date: member.membership_start_date || today, membership_end_date: endDate, updated_at: new Date().toISOString() }).eq("id", member.id).select("*").single());
  let emailStatus = "failed";
  try { emailStatus = await sendMembershipConfirmation(s, updated); } catch {}
  return { status: membershipStatus === "active" ? "confirmed" : "expired", membership_id: membershipId, email_status: emailStatus };
}
export async function confirmMembershipPayment(s: any, session: any) {
  const member = checked(await s.from("club_memberships").select("*").eq("id", session.metadata?.membership_id).single());
  const config = paymentConfiguration();
  if (session.metadata?.type !== "membership" || session.mode !== "payment" || session.status !== "complete" || session.payment_status !== "paid" || session.currency !== "nzd" || session.amount_total !== Number(member.total_amount_cents) || session.amount_total <= 0) throw new Error("Membership payment mismatch");
  if (((config.production || config.mode === "live") && !session.livemode) || (config.mode === "test" && session.livemode)) throw new Error("Payment mode mismatch");
  if (member.stripe_checkout_session_id && member.stripe_checkout_session_id !== session.id) throw new Error("Checkout mismatch");
  if (member.payment_status === "refunded" || member.membership_status === "cancelled") throw new Error("Administrator review required");
  const pi = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id || "";
  const paid = checked(await s.from("club_memberships").update({ payment_status: "paid", stripe_checkout_session_id: session.id, stripe_payment_intent_id: pi, updated_at: new Date().toISOString() }).eq("id", member.id).in("payment_status", ["pending_payment", "failed", "expired", "paid"]).neq("membership_status", "cancelled").select("*").single());
  const existingRecord = checked(await s.from("payment_records").select("id").eq("stripe_checkout_session_id", session.id).limit(1).maybeSingle());
  if (!existingRecord) checked(await s.from("payment_records").upsert({ id: member.id, payment_type: "membership", reference_id: member.id, email: member.email, amount_cents: session.amount_total, status: "paid", stripe_checkout_session_id: session.id, stripe_payment_intent_id: pi }, { onConflict: "id", ignoreDuplicates: true }));
  return activateMembership(s, paid);
}
