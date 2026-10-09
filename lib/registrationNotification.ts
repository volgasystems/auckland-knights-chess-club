import { createHash } from "node:crypto";
import { sendEmail } from "@/lib/email";
// Acknowledgement has a separate log from the payment-confirmed email.
export async function notifyRegistrationReceived(s: any, record: any, kind: "membership" | "tournament", title?: string) {
 const hash = createHash("sha256").update(`registration-received:${kind}:${record.id}`).digest("hex");
 const id = `${hash.slice(0,8)}-${hash.slice(8,12)}-${hash.slice(12,16)}-${hash.slice(16,20)}-${hash.slice(20,32)}`;
 try {
  const { error } = await s.from("email_delivery_logs").insert({ id, recipient_email: record.email, recipient_name: `${record.first_name} ${record.last_name}`, status: "queued" });
  if (error) { if (error.code === "23505") return "pending"; throw error; }
  const text = `Hello ${record.first_name},\n\nWe received your ${kind === "membership" ? "Auckland Knights membership registration" : `registration for ${title || "the tournament"}`}.\n\nPlayer: ${record.first_name} ${record.last_name}\nReference: ${record.id}\nStatus: Pending payment\n\nRegistration is not confirmed until payment is completed. You will receive a separate confirmation after payment is verified. ${kind === "tournament" ? "Tournament fees are separate from membership fees and apply to club members too. " : ""}If you already paid, do not pay again; contact the club with your reference.\n\nAuckland Knights Chess Club`;
  await sendEmail({ to: record.email, subject: `Registration received — ${kind === "membership" ? "Auckland Knights membership" : title || "Tournament"}`, text, html: `<p>${text.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]!)).replace(/\n/g,'<br>')}</p>` });
  const result = await s.from("email_delivery_logs").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", id); if (result.error) throw result.error;
  return "sent";
 } catch {
  await s.from("email_delivery_logs").update({ status: "failed", error_message: "Registration acknowledgement email failed. Check Email Diagnostics. Payment confirmation is sent separately." }).eq("id", id);
  return "failed";
 }
}
