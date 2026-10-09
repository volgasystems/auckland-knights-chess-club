import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { sendEmail } from "@/lib/email";
import { memberAccessToken, recoveryClaim } from "@/lib/membershipAccess";
import { paymentConfiguration } from "@/lib/paymentConfig";
export async function POST(req: Request) {
  const message = "If matching memberships exist, we have emailed their IDs and secure renewal links. Check your inbox and spam folder.";
  let service: any; let deliveryId = "";
  try {
    const body = await req.json(); const email = String(body.email || "").trim().toLowerCase(); const surname = String(body.surname || "").trim(); const membershipId = String(body.membership_id || "").trim().toUpperCase();
    if ((!email && !membershipId) || email.length > 254 || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) || surname.length > 100 || membershipId.length > 64) return NextResponse.json({ error: "Enter your membership ID or registered email. Surname is optional." }, { status: 400 });
    const s = createSupabaseServiceClient(); service = s; const claim = recoveryClaim(email || `id:${membershipId}`); deliveryId = claim;
    const { error: claimError } = await s.from("email_delivery_logs").insert({ id: claim, recipient_email: email || "Membership ID lookup", recipient_name: "Membership lookup", status: "queued" });
    if (claimError?.code === "23505") { deliveryId = ""; return NextResponse.json({ message: "Please check your inbox or wait one minute before requesting another link." }); }
    if (claimError) throw claimError;
    let query = s.from("club_memberships").select("id,email,membership_id").in("payment_status", ["paid", "manual_paid", "waived"]).neq("membership_status", "cancelled");
    if (email) query = query.ilike("email", email.replace(/[\\%_]/g, "\\$&"));
    if (membershipId) query = query.ilike("membership_id", membershipId.replace(/[\\%_]/g, "\\$&"));
    if (surname) query = query.ilike("last_name", surname.replace(/[\\%_]/g, "\\$&"));
    const { data, error } = await query.limit(10); if (error) throw error;
    const members = (data || []).filter((m: any) => m.membership_id);
    if (members.length) {
      const links = members.map((m: any) => `Membership ID: ${m.membership_id}\nView membership / renew: ${paymentConfiguration().siteUrl}/join?member_token=${memberAccessToken(m)}`).join("\n\n");
      const text = `Your Auckland Knights membership records\n\n${links}\n\nLinks expire in 30 minutes. If you did not request this email, you can ignore it.`;
      const recipient = email || members[0].email;
      if (!recipient || members.some((m: any) => m.email.toLowerCase() !== recipient.toLowerCase())) throw new Error("Invalid membership recipient");
      await s.from("email_delivery_logs").update({ recipient_email: recipient }).eq("id", claim);
      await sendEmail({ to: recipient, subject: "Your Auckland Knights membership ID and renewal link", text, html: `<p>${text.replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]!)).replace(/\n/g,"<br>")}</p>` });
    }
    const { error: logError } = await s.from("email_delivery_logs").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", claim); if (logError) throw logError;
    return NextResponse.json({ message });
  } catch { if (service && deliveryId) await service.from("email_delivery_logs").update({ status: "failed", error_message: "Membership lookup email failed. Check Email Diagnostics." }).eq("id", deliveryId); return NextResponse.json({ error: "We could not send a membership lookup email right now. Please try later or contact the club. No payment was taken." }, { status: 503 }); }
}
