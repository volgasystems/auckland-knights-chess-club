"use client";
import { useState } from "react";
import { formatMoney } from "@/lib/format";

export default function MembershipRenewal({ member: verifiedMember, token, options, linkError }: { member: any; token?: string; options: any[]; linkError?: string }) {
 const [member, setMember] = useState(verifiedMember);
 const [memberToken, setMemberToken] = useState(token);
 const [matches, setMatches] = useState<any[]>([]);
 const [message, setMessage] = useState(linkError || "");
 const [busy, setBusy] = useState(false);
 const [option, setOption] = useState(options[0]?.key || "");
 const [terms, setTerms] = useState(false);
 function choose(found: any) {
  setMember(found); setMemberToken(found.checkout_token); setTerms(false);
  setOption(options.some(o => o.key === found.option_key) ? found.option_key : options[0]?.key || "");
  setMessage("Member details filled below.");
 }
 async function search(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault(); setBusy(true); setMessage(""); setMatches([]);
  const data = new FormData(e.currentTarget);
  try {
   const res = await fetch('/api/membership/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: data.get('email'), surname: data.get('surname'), membership_id: data.get('membership_id') }) });
   const result = await res.json();
   if (!res.ok) { setMessage(result.error || 'Unable to search membership.'); return; }
   setMatches(result.members || []);
   if (result.members?.length === 1) choose(result.members[0]); else setMessage(result.message);
  } catch { setMessage('Unable to search membership. Try again later.'); } finally { setBusy(false); }
 }
 async function renew(e: React.FormEvent) {
  e.preventDefault(); setBusy(true);
  try {
   const res = await fetch('/api/membership/renew', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ member_token: memberToken, option_key: option, terms_accepted: terms }) });
   const result = await res.json();
   if (res.ok && result.url) window.location.href = result.url; else setMessage(result.error || 'Unable to start renewal.');
  } catch { setMessage('Connection interrupted. If you paid, do not pay again. Contact the club.'); } finally { setBusy(false); }
 }
 const publicFields = [["first_name", "First name"], ["last_name", "Surname"], ["membership_id", "Membership ID"], ["membership_end_date", "Membership expiry"], ["payment_status", "Payment status"], ["membership_status", "Membership status"]];
 const privateFields = [["email", "Registered email"], ["phone", "Phone"], ["date_of_birth", "Date of birth"], ["school", "School"], ["nzcf_id", "NZCF ID"], ["fide_id", "FIDE ID"], ["street_address", "Street address"], ["suburb", "Suburb"], ["city", "City"], ["postcode", "Postcode"]];
 return <section id="membership-search" className="card mb-8 scroll-mt-24 p-6">
  <h2 className="text-2xl font-extrabold">Find Your Membership / Renew</h2>
  {!member ? <>
   <form onSubmit={search} className="mt-4">
    <p className="text-sm text-stone-600">Enter your membership ID or registered email. Add a surname to find a player in a family. Matching membership details appear here immediately; no email link is required.</p>
    <div className="mt-4 grid gap-4 md:grid-cols-3">
     <label><span className="label">Membership ID</span><input name="membership_id" maxLength={64} placeholder="e.g. AKCC01001" className="input mt-1" /></label>
     <label><span className="label">Registered email</span><input name="email" type="email" maxLength={254} className="input mt-1" /></label>
     <label><span className="label">Player surname (optional)</span><input name="surname" maxLength={100} className="input mt-1" /></label>
    </div>
    <button disabled={busy} className="btn-primary mt-4">{busy ? 'Searching…' : 'Find Membership'}</button>
   </form>
   {matches.length > 1 && <div className="mt-5 space-y-3"><p className="font-bold">Select the player:</p>{matches.map(found => <button key={found.result_key} type="button" onClick={() => choose(found)} className="btn-secondary block w-full text-left">{found.first_name} {found.last_name} · {found.membership_id} · {String(found.payment_status || "").replaceAll("_", " ")}</button>)}</div>}
  </> : <div>
   <div className="mt-4 grid gap-4 md:grid-cols-2">{[...publicFields, ...(verifiedMember === member ? privateFields : [])].map(([field, label]) => <label key={field}><span className="label">{label}</span><input className="input mt-1" value={member[field] || ""} readOnly /></label>)}</div>
   {(verifiedMember || member.checkout_token) && <p className="mt-3 text-sm text-stone-600">Renewal keeps your membership ID. Your new period starts after your current expiry, or today if already expired. Membership is renewed only after payment is confirmed.</p>}
   {(verifiedMember || member.checkout_token) ? <form onSubmit={renew} className="mt-4 space-y-4">
    <label className="block"><span className="label">Membership option and fee</span><select value={option} onChange={e => setOption(e.target.value)} required className="input mt-1">{options.map(o => <option key={o.key} value={o.key}>{o.name} — {formatMoney(o.fee_cents)} ({o.valid_until_month ? `ends in month ${o.valid_until_month}` : `${o.validity_months || 12} months`})</option>)}</select></label>
    {!options.length && <p role="alert">No active membership fees are available. Contact the club.</p>}
    <p className="text-sm">Fees are not refundable or transferable once processed. Club rules require respectful behaviour and quiet play; parents/guardians remain responsible for children.</p>
    <label className="flex gap-2"><input type="checkbox" checked={terms} onChange={e => setTerms(e.target.checked)} required />I accept the membership terms.</label>
    <button disabled={busy || !options.length} className="btn-primary">{busy ? 'Preparing renewal…' : 'Renew & Pay'}</button>
   </form> : <p role="status" className="mt-4 rounded-lg bg-amber-50 p-4">This record is {String(member.payment_status || "unconfirmed").replaceAll("_", " ")} / {String(member.membership_status || "unconfirmed").replaceAll("_", " ")}. Contact the club to complete or check the original registration. If you already paid, do not pay again.</p>}
   {!verifiedMember && <button type="button" onClick={() => { setMember(null); setMemberToken(undefined); setTerms(false); setMessage(""); }} className="btn-secondary mt-4">Search Another Member</button>}
  </div>}
  {message && <p role="status" className="mt-4 rounded-lg bg-stone-50 p-3 text-sm font-bold">{message}</p>}
 </section>;
}
