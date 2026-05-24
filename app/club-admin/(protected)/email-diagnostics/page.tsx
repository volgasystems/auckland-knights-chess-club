import { requireAdmin } from "@/lib/auth";
import { getEmailProviderStatus, verifyEmailProvider } from "@/lib/email";
import EmailDiagnosticsClient from "@/components/admin/EmailDiagnosticsClient";

export default async function EmailDiagnosticsPage() {
  await requireAdmin("email_diagnostics");
  const providerStatus = await getEmailProviderStatus();
  const verification = await verifyEmailProvider();
  return <EmailDiagnosticsClient providerStatus={providerStatus} verification={verification} />;
}
