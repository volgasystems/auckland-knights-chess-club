"use client";
import { useEffect, useState } from "react";
export default function PaymentVerification({ sessionId, reference }: { sessionId: string; reference: string }) {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  async function verify() {
    setLoading(true);
    try {
      const res = await fetch("/api/payments/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ session_id: sessionId }) });
      const data = await res.json();
      setResult(data);
    } catch { setResult({ error: "We could not check your entry. If payment was taken, do not pay again. Contact info@aucklandknights.co.nz." }); }
    finally { setLoading(false); }
  }
  useEffect(() => { if (sessionId) void verify(); }, [sessionId]);
  const confirmed = result?.status === "confirmed";
  return <div aria-live="polite">
    <h1 className={`text-3xl font-extrabold ${confirmed ? "text-green-800" : "text-akcc-blue"}`}>{confirmed ? "Registration Confirmed" : loading ? "Checking Payment and Registration" : "Registration Status"}</h1>
    {!sessionId ? <p className="mt-4">We cannot verify this payment from the return link. If you paid, contact the club with your reference. Do not pay again.</p>
      : confirmed ? <><p className="mt-4">Your payment is verified and your registration is confirmed.</p>{result.email_status && <p className="mt-3">{result.email_status === "sent" ? "Your confirmation email has been sent. Please check your inbox and spam folder." : "Your entry is saved, but the confirmation email is delayed or could not be sent. You do not need to register or pay again."}</p>}</>
      : <p className="mt-4 text-amber-900">{result?.error || result?.message || "Please wait while we check your entry. Do not pay again while confirmation is pending."}</p>}
    {result?.membership_id && <p className="mt-4 text-lg font-bold">Membership ID: {result.membership_id}</p>}
    {(result?.registration_id || reference) && <p className="mt-4 break-all text-sm"><b>Entry reference:</b> {result?.registration_id || reference}</p>}
    {sessionId && !confirmed && <button onClick={verify} disabled={loading} className="btn-secondary mt-5">{loading ? "Checking..." : "Check Again"}</button>}
    <p className="mt-5 text-sm">For help, email <a href="mailto:info@aucklandknights.co.nz" className="underline">info@aucklandknights.co.nz</a> with your entry reference and payment receipt.</p>
  </div>;
}
