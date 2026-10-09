"use client";
import { useState } from "react";
export default function MembershipNumbering({ initial }: { initial: any }) {
  const [prefix, setPrefix] = useState(initial?.membership_id_prefix || "AKCC");
  const [start, setStart] = useState(initial?.membership_id_start || 1001);
  const [digits, setDigits] = useState(initial?.membership_id_digits || 5);
  const [next, setNext] = useState(initial?.membership_id_next);
  const [message, setMessage] = useState(""); const [loading, setLoading] = useState(false);
  async function save(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    try {
      const res = await fetch("/api/admin/membership-numbering", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prefix, start, digits }) });
      const data = await res.json();
      if (!res.ok) { setMessage(data.error); return; }
      setNext(data.next); setMessage(`Saved. Next ID: ${data.prefix}${String(data.next).padStart(data.digits, "0")}. Existing member IDs are unchanged.`);
    } catch { setMessage("Unable to save numbering. Please try again."); } finally { setLoading(false); }
  }
  return <section className="card mb-6 p-5"><h2 className="text-xl font-bold">Membership ID Numbering</h2>
    <p className="mt-2 text-sm">IDs are assigned automatically when membership payment is confirmed. The counter advances safely and never renumbers existing members.</p>
    {initial?.membership_id_next == null && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Apply supabase/migration_v4_4_membership_numbering.sql in the Supabase SQL editor to enable configurable starting numbers. Existing payments continue using the current sequence.</p>}
    <form onSubmit={save} className="mt-4 grid gap-3 md:grid-cols-4">
      <label><span className="admin-label">Prefix</span><input value={prefix} onChange={e=>setPrefix(e.target.value.toUpperCase())} pattern="[A-Z][A-Z0-9-]{0,11}" maxLength={12} required className="admin-input" /></label>
      <label><span className="admin-label">Starting number</span><input type="number" min={1} max={999999999} value={start} onChange={e=>setStart(Number(e.target.value))} required className="admin-input" /></label>
      <label><span className="admin-label">Minimum number digits</span><input type="number" min={1} max={9} value={digits} onChange={e=>setDigits(Number(e.target.value))} required className="admin-input" /></label>
      <button disabled={loading} className="btn-primary mt-5">{loading ? "Saving..." : "Save Numbering"}</button>
    </form>
    <p className="mt-3 text-sm">{next ? `Next ID: ${prefix}${String(next).padStart(digits, "0")}.` : `Example: ${prefix}${String(start).padStart(digits, "0")}.`} Numbers already assigned or reserved are skipped.</p>
    {message && <p role="status" className="mt-3 text-sm font-bold">{message}</p>}
  </section>;
}
