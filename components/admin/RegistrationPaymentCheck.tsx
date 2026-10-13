"use client";
import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
export default function RegistrationPaymentCheck({ id, onMessage }: { id: string; onMessage?: (message: string) => void }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();
  const report = (value: string) => { setMessage(value); onMessage?.(value); };
  async function check() {
    setLoading(true); setMessage("");
    try {
      const res = await fetch("/api/admin/payments/reconcile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ registration_id: id }) });
      const data = await res.json();
      report(data.error || data.message || (data.status === "confirmed" ? `Entry confirmed. ${data.email_status === "sent" ? "Confirmation email sent." : "Email pending or failed. Check Email Diagnostics and retry."}` : "Entry is not confirmed."));
      if (res.ok) router.refresh();
    } catch { report("Unable to check payment. No new charge was made. Please try again."); }
    finally { setLoading(false); }
  }
  return <div><button type="button" onClick={check} disabled={loading} title="Check payment / retry confirmation email" aria-label="Check payment / retry confirmation email" className="inline-flex h-9 w-9 items-center justify-center bg-stone-600 text-white disabled:opacity-50"><RefreshCw size={16} className={loading ? "animate-spin" : ""}/></button>{message && !onMessage && <p role="status" className="mt-2 max-w-xs text-xs font-semibold">{message} Refresh the report to see updated totals.</p>}</div>;
}
