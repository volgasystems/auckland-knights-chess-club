import { tournamentEmailRecipients } from "@/lib/tournamentEmailRecipients";
import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { canAccess } from "@/lib/roles";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getEmailProviderStatus, sendEmail } from "@/lib/email";

import { renderEmailTemplate as render, emailTextHtml, missingEmailValues } from "@/lib/emailTemplate";

function fullName(m: any) { return `${m.first_name || ""} ${m.last_name || ""}`.trim(); }
function valuesFor(m: any, customMessage = "") {
  return {
    first_name: m.first_name || "",
    last_name: m.last_name || "",
    full_name: fullName(m),
    email: m.email || "",
    membership_id: m.membership_id || "",
    membership_type: Array.isArray(m.membership_options) ? m.membership_options.map((x:any)=>x.name).join(", ") : "",
    membership_start_date: m.membership_start_date || "",
    membership_end_date: m.membership_end_date || "",
    membership_status: m.membership_status || "",
    club_name: "Auckland Knights Chess Club",
    message: customMessage,
  };
}
function normalise(value: any) { return String(value || "").trim().toLowerCase(); }
function isPaid(m: any) {
  const p = normalise(m.payment_status);
  return ["paid", "manual_paid", "waived", "complete", "completed", "confirmed"].includes(p) || Boolean(m.stripe_payment_intent_id);
}
function isExpired(m: any, now = new Date()) {
  const status = normalise(m.membership_status);
  if (["expired", "inactive", "cancelled", "deleted", "archived"].includes(status)) return true;
  return Boolean(m.membership_end_date && new Date(m.membership_end_date) < now);
}
function isActiveMember(m: any, now = new Date()) {
  const status = normalise(m.membership_status);
  if (isExpired(m, now)) return false;
  // Older test data may only have payment_status=paid and no membership_status yet.
  return status === "active" || isPaid(m);
}
function filterMembers(members: any[], group: string, selectedIds: string[]) {
  const now = new Date();
  const soon = new Date(); soon.setDate(soon.getDate() + 45);
  const usable = members.filter((m) => String(m.email || "").includes("@"));
  if (group === "all") return usable;
  if (group === "selected") return usable.filter((m) => selectedIds.includes(m.id));
  if (group === "active") return usable.filter((m) => isActiveMember(m, now));
  if (group === "paid") return usable.filter((m) => isPaid(m));
  if (group === "expired") return usable.filter((m) => isExpired(m, now));
  if (group === "expiring_soon") return usable.filter((m) => isActiveMember(m, now) && m.membership_end_date && new Date(m.membership_end_date) >= now && new Date(m.membership_end_date) <= soon);
  return [];
}

export async function POST(req: Request) {
  const admin = await getCurrentAdmin();
  if (!admin || !canAccess(admin.profile.role, "bulk_email")) return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  const body = await req.json();
  const action = body.action === "send" ? "send" : body.action === "test" ? "test" : "preview";
  const s = createSupabaseServiceClient();
  const { data: template, error: templateError } = await s.from("email_templates").select("*").eq("id", body.template_id).maybeSingle();
  if (templateError || !template) return NextResponse.json({ error: "Template not found" }, { status: 404 });
  const { data: members, error } = await s.from("club_memberships").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  let recipients = filterMembers(members || [], String(body.target_group || "active"), Array.isArray(body.selected_ids) ? body.selected_ids : []);
  const needsTournament = /{{\s*tournament_(name|title)\s*}}/.test(`${template.subject} ${template.body}`) || ["calendar_registration","general_tournament_paid"].includes(template.template_key);
  let tournament: any = null;
  if (needsTournament && body.tournament_id) {
    const {data:event,error:eventError} = await s.from("tournaments").select("id,title").eq("id", body.tournament_id).maybeSingle();
    if (eventError || !event) return NextResponse.json({error:"Selected tournament could not be loaded."}, {status:400});
    tournament = event;
    const {data:registrations,error:registrationError} = await s.from("tournament_registrations").select("id,first_name,last_name,email,payment_status,registration_status,category_name,entry_fee_cents").eq("tournament_id", event.id).eq("payment_status","paid").eq("registration_status","confirmed");
    if (registrationError) return NextResponse.json({error:"Tournament registrations could not be loaded."}, {status:400});
    recipients = tournamentEmailRecipients(recipients, registrations || []);
  }
  if (needsTournament && !tournament && action === "send") return NextResponse.json({error:"Select a tournament and preview the email before sending."}, {status:400});
  const eventValues = tournament ? {tournament_name:tournament.title,tournament_title:tournament.title} : {};
  const first = recipients[0];
  const sampleValues: Record<string, any> = {...eventValues, ...(first ? valuesFor(first, body.custom_message) : { first_name: "Bharat", full_name: "Bharat Somaraju", membership_id: "AK01001", membership_end_date: "31 Dec", message: body.custom_message || "" })};
  const missing = missingEmailValues(`${template.subject}\n${template.body}`, sampleValues);
  if (action === "send" && missing.length) return NextResponse.json({error:`This template requires ${missing.join(", ")}, which are unavailable for the selected recipients. Select the matching event or use a member notice template.`}, {status:400});
  if (action !== "send") for (const key of missing) (sampleValues as Record<string, any>)[key] = `[Sample ${key.replace(/_/g, " ")}]`;
  const subject = render(template.subject, sampleValues);
  const sample_body = render(template.body, sampleValues);

  if (action === "preview") {
    return NextResponse.json({ recipient_count: recipients.length, subject, sample_body, provider_status: await getEmailProviderStatus(), recipients: recipients.map((m:any)=>({ email:m.email, full_name:fullName(m), membership_id:m.membership_id, membership_status:m.membership_status, payment_status:m.payment_status })) });
  }

  if (action === "test") {
    const emailStatus = await getEmailProviderStatus();
    if (!emailStatus.configured) {
      return NextResponse.json({ error: `Email provider is not configured. Missing: ${emailStatus.missing.join(", ") || "email settings"}.`, provider_status: emailStatus }, { status: 400 });
    }
    const to = String(body.test_email || "").trim();
    if (!to.includes("@")) return NextResponse.json({ error: "Please enter a valid test email address." }, { status: 400 });
    try {
      await sendEmail({ to, subject, text: sample_body, html: emailTextHtml(sample_body) });
      return NextResponse.json({ ok: true, recipient_count: 1, sent_count: 1, subject, sample_body, provider_status: emailStatus, message: `Test email sent to ${to}.` });
    } catch (e:any) {
      return NextResponse.json({ error: e?.message || "Test email failed", provider_status: emailStatus }, { status: 400 });
    }
  }

  const emailStatus = await getEmailProviderStatus();
  if (!emailStatus.configured) {
    return NextResponse.json({
      error: `Email provider is not configured. Missing: ${emailStatus.missing.join(", ") || "email settings"}. You can use Resend or Brevo SMTP.`,
      provider_status: emailStatus,
    }, { status: 400 });
  }
  if (!recipients.length) return NextResponse.json({ error: "No recipients matched your selection. Try All members or Selected individual members, or check member payment/status fields." }, { status: 400 });

  const { data: notice, error: noticeError } = await s.from("member_notices").insert({
    title: template.name,
    target_group: body.target_group || "active",
    template_id: template.id,
    subject: template.subject,
    body: template.body,
    recipient_count: recipients.length,
    status: "sent",
    sent_by: admin.user.id,
    sent_at: new Date().toISOString(),
  }).select("*").single();
  if (noticeError) return NextResponse.json({ error: noticeError.message }, { status: 400 });

  let sent = 0;
  for (const m of recipients) {
    const values = {...valuesFor(m, body.custom_message), ...eventValues};
    try {
      await sendEmail({ to: m.email, subject: render(template.subject, values), text: render(template.body, values), html: emailTextHtml(render(template.body, values)) });
      sent += 1;
      await s.from("email_delivery_logs").insert({ notice_id: notice.id, recipient_email: m.email, recipient_name: fullName(m), status: "sent", sent_at: new Date().toISOString() });
    } catch (e: any) {
      await s.from("email_delivery_logs").insert({ notice_id: notice.id, recipient_email: m.email, recipient_name: fullName(m), status: "failed", error_message: e.message });
    }
  }
  return NextResponse.json({ ok: true, notice_id: notice.id, recipient_count: recipients.length, sent_count: sent, provider_status: emailStatus, subject, sample_body });
}
