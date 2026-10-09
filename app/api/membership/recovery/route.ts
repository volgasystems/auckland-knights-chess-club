import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { sendEmail } from "@/lib/email";
import { memberAccessToken, recoveryClaim } from "@/lib/membershipAccess";
import { paymentConfiguration } from "@/lib/paymentConfig";
export async function POST(req: Request) {
  const message = "If matching memberships exist, we have emailed their IDs and secure renewal links. Check your inbox and spam folder.";
  let service: any; let deliveryId = "";
  try {
    const body = await req.json(); const email = String(body.email || "").trim().toLowerCase(); const surname = String(body.surname || "").trim();
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || surname.length > 100) return NextResponse.json({ error: "Enter your registered email. You can also enter your surname to narrow the search." }, { status: 400 });
    const s = createSupabaseServiceClient(); service = s; const claim = recoveryClaim(email); deliveryId = claim;
    const { error: claimError } = await s.from("email_delivery_logs").insert({ id: claim, recipient_email: email, recipient_name: "Membership lookup", status: "queued" });
    if (claimError?.code === "23505") { deliveryId = ""; return NextResponse.json({ message: "Please check your inbox or wait one minute before requesting another link." }); }
    if (claimError) throw claimError;
    let query = s.from("club_memberships").select("id,email,membership_id").ilike("email", email.replace(/[\\%_]/g, "\\$&")).in("payment_status", ["paid", "manual_paid", "waived"]).neq("membership_status", "cancelled");
    if (surname) query = query.ilike("last_name", surname.replace(/[\\%_]/g, "\\$&"));
    const { data, error } = await query.limit(10); if (error) throw error;
    const members = (data || []).filter((m: any) => m.membership_id);
    if (members.length) {
      const links = members.map((m: any) => `Membership ID: ${m.membership_id}\nView membership / renew: ${paymentConfiguration().siteUrl}/join?member_token=${memberAccessToken(m)}`).join("\n\n");
      const text = `Your Auckland Knights membership records\n\n${links}\n\nLinks expire in 30 minutes. If you did not request this email, you can ignore it.`;
      await sendEmail({ to: email, subject: "Your Auckland Knights membership ID and renewal link", text, html: `<p>${text.replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]!)).replace(/\n/g,"<br>")}</p>` });
    }
    const { error: logError } = await s.from("email_delivery_logs").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", claim); if (logError) throw logError;
    return NextResponse.json({ message });
  } catch { if (service && deliveryId) await service.from("email_delivery_logs").update({ status: "failed", error_message: "Membership lookup email failed. Check Email Diagnostics." }).eq("id", deliveryId); return NextResponse.json({ error: "We could not send a membership lookup email right now. Please try later or contact the club. No payment was taken." }, { status: 503 }); }
}
