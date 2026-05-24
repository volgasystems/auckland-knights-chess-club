import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { sendEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const required = ["full_name", "email", "subject", "message"];
    for (const key of required) {
      if (!String(body[key] || "").trim()) return NextResponse.json({ error: `${key.replace("_", " ")} is required` }, { status: 400 });
    }
    const service = createSupabaseServiceClient();
    const payload = {
      full_name: String(body.full_name || "").trim(),
      email: String(body.email || "").trim(),
      phone: String(body.phone || "").trim(),
      enquiry_type: String(body.enquiry_type || "General enquiry").trim(),
      subject: String(body.subject || "").trim(),
      message: String(body.message || "").trim(),
      status: "new"
    };
    const { data, error } = await service.from("contact_enquiries").insert(payload).select("*").single();
    if (error) throw error;

    try {
      const { data: settings } = await service.from("club_settings").select("general_email").eq("id", "default").maybeSingle();
      const to = settings?.general_email || process.env.CLUB_FROM_EMAIL;
      if (to) await sendEmail({
        to,
        subject: `Website enquiry: ${payload.subject}`,
        html: `<p><b>Name:</b> ${payload.full_name}</p><p><b>Email:</b> ${payload.email}</p><p><b>Phone:</b> ${payload.phone}</p><p><b>Type:</b> ${payload.enquiry_type}</p><p>${payload.message}</p>`
      });
    } catch {}

    return NextResponse.json({ ok: true, data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Unable to submit enquiry" }, { status: 400 });
  }
}
