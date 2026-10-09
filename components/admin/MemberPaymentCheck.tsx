"use client";
import { useState } from "react";
import { RefreshCw } from "lucide-react";
export default function MemberPaymentCheck({ id }: { id: string }) {
  const [busy,setBusy]=useState(false); const [message,setMessage]=useState("");
  async function check(){ setBusy(true); try {
    const res=await fetch("/api/admin/members/reconcile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({member_id:id})}); const data=await res.json();
    setMessage(data.error || `Membership ${data.status === "expired" ? "expired" : "active"}: ${data.membership_id}. ${data.email_status==="sent"?"Confirmation email sent.":"Email pending or failed. Check Email Diagnostics, then retry."} Refresh to see changes.`);
  }catch{setMessage("Check failed. No new payment was taken.");}finally{setBusy(false);} }
  return <div><button onClick={check} disabled={busy} title="Check payment and retry confirmation email" aria-label="Check payment and retry confirmation email" className="inline-flex h-9 w-9 items-center justify-center bg-stone-600 text-white disabled:opacity-50"><RefreshCw size={16} className={busy ? "animate-spin" : ""} /></button>{message&&<p role="status" className="mt-2 max-w-xs text-xs">{message}</p>}</div>;
}
