"use client";
import { useState } from "react";

type Props = { providerStatus: any; verification: any };

export default function EmailDiagnosticsClient({ providerStatus, verification }: Props) {
  const [to, setTo] = useState("");
  const [result, setResult] = useState<any>(verification);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    const res = await fetch("/api/admin/email-diagnostics");
    const json = await res.json();
    setLoading(false);
    if (!res.ok) return alert(json.error || "Diagnostics failed");
    setResult(json.verification);
  }

  async function sendTest() {
    if (!to.includes("@")) return alert("Please enter a valid test email address.");
    setLoading(true);
    const res = await fetch("/api/admin/email-diagnostics", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to }) });
    const json = await res.json();
    setLoading(false);
    setResult(json);
    if (!res.ok) return alert(json.error || "Test email failed");
    alert(json.message || "Test email sent.");
  }

  return <div className="space-y-6">
    <div><h1 className="text-3xl font-extrabold">Email Diagnostics</h1><p className="mt-2 text-sm text-stone-600">Use this page to verify Brevo SMTP / Resend configuration before sending bulk email.</p></div>
    <section className="card p-6">
      <h2 className="text-xl font-bold">Provider Status</h2>
      <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
        <p><b>Provider:</b> {providerStatus.providerLabel}</p>
        <p><b>Configured:</b> {providerStatus.configured ? "Yes" : "No"}</p>
        <p><b>From email:</b> {providerStatus.fromEmail || "Missing"}</p>
        <p><b>Reply-to:</b> {providerStatus.replyTo || "Not set"}</p>
        <p><b>SMTP host:</b> {providerStatus.smtpHost || "Not set"}</p>
        <p><b>Missing:</b> {providerStatus.missing?.length ? providerStatus.missing.join(", ") : "None"}</p>
      </div>
      <div className={`mt-5 rounded-xl p-4 text-sm ${result?.ok ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"}`}>
        <b>{result?.ok ? "Success" : "Attention"}:</b> {result?.message || result?.error || "No diagnostic result yet."}
      </div>
      <div className="mt-5 flex flex-wrap gap-3"><button onClick={refresh} disabled={loading} className="btn-secondary">Refresh Diagnostics</button></div>
    </section>
    <section className="card p-6">
      <h2 className="text-xl font-bold">Send Test Email</h2>
      <p className="mt-2 text-sm text-stone-600">Send a single test email before using Bulk Email.</p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row"><input value={to} onChange={(e)=>setTo(e.target.value)} placeholder="test@example.com" className="admin-input"/><button onClick={sendTest} disabled={loading} className="btn-primary">Send Test Email</button></div>
    </section>
    <section className="card p-6 text-sm text-stone-700">
      <h2 className="text-xl font-bold text-black">Brevo Free SMTP settings</h2>
      <pre className="mt-3 overflow-x-auto rounded-xl bg-stone-950 p-4 text-xs text-white">{`EMAIL_PROVIDER=smtp\nSMTP_HOST=smtp-relay.brevo.com\nSMTP_PORT=587\nSMTP_SECURE=false\nSMTP_USER=your_brevo_smtp_login\nSMTP_PASS=your_brevo_smtp_key\nCLUB_FROM_EMAIL=info@aucklandknights.co.nz\nCLUB_FROM_NAME=Auckland Knights Chess Club\nCLUB_REPLY_TO_EMAIL=info@aucklandknights.co.nz`}</pre>
    </section>
  </div>;
}
