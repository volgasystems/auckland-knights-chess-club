"use client";
import { useRef, useState } from "react";
import { BadgeCheck, X } from "lucide-react";
import { useRouter } from "next/navigation";
export default function RegistrationManualConfirm({ id, player, tournament, fee, onMessage }: { id: string; player: string; tournament: string; fee: number; onMessage: (message: string) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [method, setMethod] = useState("cash"), [note, setNote] = useState(""), [received, setReceived] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const res = await fetch("/api/admin/payments/manual-confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ registration_id: id, method, note, received }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to confirm payment.");
      onMessage(`${data.message || "Entry confirmed."} ${data.email_status === "sent" ? "Confirmation email sent." : "Confirmation email pending or failed. Use Check payment to retry."}`);
      dialog.current?.close(); router.refresh();
    } catch (e: any) { setError(e.message || "Unable to confirm payment."); }
    finally { setBusy(false); }
  }
  return <><button type="button" title="Confirm cash or verified payment" aria-label="Confirm cash or verified payment" onClick={() => { setError(""); dialog.current?.showModal(); }} className="inline-flex h-9 w-9 items-center justify-center bg-green-700 text-white"><BadgeCheck size={16}/></button><dialog ref={dialog} onCancel={event => { if (busy) event.preventDefault(); }} className="m-auto w-[calc(100%_-_2rem)] max-w-lg rounded-2xl p-0 shadow-2xl backdrop:bg-black/50"><form onSubmit={save} className="p-6"><div className="flex items-center justify-between gap-4"><h2 className="text-xl font-extrabold">Confirm payment</h2><button type="button" disabled={busy} aria-label="Close payment confirmation" onClick={() => dialog.current?.close()}><X size={22}/></button></div><p className="mt-4 font-bold">{player}</p><p className="text-sm text-stone-600">{tournament}</p><p className="mt-2">Entry fee: <b>NZ${(fee / 100).toFixed(2)}</b></p><p className="mt-3 text-sm text-stone-600">Use this after receiving the full entry fee. Approval records your name, payment method and reference. The entry will appear in the confirmed players list.</p><label className="mt-4 block">Payment method<select className="input mt-1" value={method} onChange={e => setMethod(e.target.value)}><option value="cash">Cash received</option><option value="bank_transfer">Bank transfer received</option><option value="verified_other">Other payment verified manually</option></select></label><label className="mt-4 block">Payment reference / approval note<textarea className="input mt-1" rows={3} minLength={5} maxLength={500} required value={note} onChange={e => setNote(e.target.value)} placeholder="Receipt number, bank reference or details of payment verification"/></label><label className="mt-4 flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={received} required onChange={e => setReceived(e.target.checked)}/><span>I have received or verified the full entry fee and checked for duplicate payments.</span></label>{error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}<div className="mt-6 flex justify-end gap-3"><button type="button" disabled={busy} className="btn-secondary" onClick={() => dialog.current?.close()}>Cancel</button><button disabled={busy || !received} className="btn-primary">{busy ? "Confirming…" : "Confirm payment and entry"}</button></div></form></dialog></>;
}
