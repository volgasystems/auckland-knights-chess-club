import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/auth";
import { getEmailProviderStatus, verifyEmailProvider } from "@/lib/email";
import EmailDiagnosticsClient from "@/components/admin/EmailDiagnosticsClient";

export default async function EmailDiagnosticsPage() {
  await requireAdmin("email_diagnostics");
  const providerStatus = await getEmailProviderStatus();
  const verification = await verifyEmailProvider();
  const { data: failed } = await createSupabaseServiceClient().from("email_delivery_logs").select("recipient_email,status,error_message,created_at").in("status", ["failed", "queued"]).order("created_at", { ascending: false }).limit(30);
  return <div><EmailDiagnosticsClient providerStatus={providerStatus} verification={verification} /><section className="card mt-6 p-5"><h2 className="text-xl font-bold">Recent Failed or Pending Emails</h2><p className="mt-2 text-sm">Use Check membership / retry email in Members to resend a confirmation after correcting the provider settings.</p><div className="mt-4 space-y-3">{(failed || []).map((row, index)=><div key={index} className="rounded-lg bg-amber-50 p-3 text-sm"><b>{row.recipient_email}</b> — {row.status}<p>{row.error_message || "Email send pending. Retry if it remains pending."}</p><p className="text-xs">{row.created_at}</p></div>)}</div></section></div>;
}
