import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { canAccess } from "@/lib/roles";
import { getEmailProviderStatus, sendEmail, verifyEmailProvider } from "@/lib/email";

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin || !canAccess(admin.profile.role, "email_diagnostics")) return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  const verification = await verifyEmailProvider();
  return NextResponse.json({ provider_status: await getEmailProviderStatus(), verification });
}

export async function POST(req: Request) {
  const admin = await getCurrentAdmin();
  if (!admin || !canAccess(admin.profile.role, "email_diagnostics")) return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  const body = await req.json();
  const to = String(body.to || admin.user.email || "").trim();
  if (!to.includes("@")) return NextResponse.json({ error: "Please enter a valid test recipient email address." }, { status: 400 });
  try {
    await sendEmail({
      to,
      subject: "Auckland Knights email test",
      html: `<p>Hello,</p><p>This is a test email from Auckland Knights Chess Club website.</p><p>If you received this, your email provider is working.</p>`,
    });
    return NextResponse.json({ ok: true, message: `Test email sent to ${to}.` });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Test email failed", provider_status: await getEmailProviderStatus() }, { status: 400 });
  }
}
