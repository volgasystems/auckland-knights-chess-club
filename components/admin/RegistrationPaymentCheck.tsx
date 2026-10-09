"use client";
import { useState } from "react";
export default function RegistrationPaymentCheck({ id }: { id: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  async function check() {
    setLoading(true); setMessage("");
    try {
      const res = await fetch("/api/admin/payments/reconcile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ registration_id: id }) });
      const data = await res.json();
      setMessage(data.error || data.message || (data.status === "confirmed" ? `Entry confirmed. ${data.email_status === "sent" ? "Confirmation email sent." : "Email pending or failed. Check Email Diagnostics and retry."}` : "Entry is not confirmed."));
    } catch { setMessage("Unable to check payment. No new charge was made. Please try again."); }
    finally { setLoading(false); }
  }
  return <div><button onClick={check} disabled={loading} className="btn-secondary whitespace-nowrap py-2 text-xs">{loading ? "Checking..." : "Check payment / retry email"}</button>{message && <p role="status" className="mt-2 max-w-xs text-xs font-semibold">{message} Refresh the report to see updated totals.</p>}</div>;
}
