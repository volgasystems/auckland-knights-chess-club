"use client";

import { useEffect, useMemo, useState } from "react";
import { formatMoney } from "@/lib/format";
import AddressAutocomplete from "@/components/AddressAutocomplete";

function categories(tournament: any) {
  return Array.isArray(tournament.category_options) ? tournament.category_options : [];
}

type MemberLookup = {
  id: string;
  membership_id?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  date_of_birth?: string;
  nzcf_id?: string;
  nzcf_rating?: number;
  fide_id?: string;
  fide_rating?: number;
  school?: string;
  parent_guardian_phone?: string;
  parent_guardian_first_name?: string;
  parent_guardian_last_name?: string;
  street_address?: string;
  suburb?: string;
  city?: string;
  postcode?: string;
  membership_end_date?: string;
  membership_status?: string;
  payment_status?: string;
};

export default function TournamentRegistrationForm({ tournament }: { tournament: any }) {
  const cats = categories(tournament);
  const isClubCalendar = tournament.tournament_type === "club_calendar";
  const [selectedCategory, setSelectedCategory] = useState(cats[0]?.key || cats[0]?.name || "default");
  const [paymentMode, setPaymentMode] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [paymentAvailable, setPaymentAvailable] = useState(true);
  const [loading, setLoading] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [lookupMessage, setLookupMessage] = useState("");
  const [paymentUrl, setPaymentUrl] = useState("");
  const [member, setMember] = useState<MemberLookup | null>(null);
  const [memberIdentifier, setMemberIdentifier] = useState("");
  const [address, setAddress] = useState({ street_address: "", suburb: "", city: "", postcode: "" });

  const chosen = useMemo(
    () => cats.find((c: any) => (c.key || c.name) === selectedCategory),
    [cats, selectedCategory]
  );
  const fee = chosen ? Number(chosen.fee_cents || 0) : Number(tournament.entry_fee_cents || 0);

  useEffect(() => {
    if (fee > 0) {
      fetch("/api/payments/status").then((res) => res.json()).then((data) => { setPaymentMode(data.mode); setPaymentAvailable(data.available); }).catch(() => {});
    }
  }, [isClubCalendar, fee]);

  async function findMember() {
    setLookupLoading(true);
    setLookupMessage("");
    setMember(null);
    const identifier = memberIdentifier.trim();
    if (!identifier) {
      setLookupLoading(false);
      setLookupMessage("Please enter Membership ID or registered email address.");
      return;
    }
    const isEmail = identifier.includes("@");
    const res = await fetch("/api/membership/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(isEmail ? { email: identifier } : { membership_id: identifier }),
    });
    const json = await res.json();
    setLookupLoading(false);
    if (!res.ok) {
      setLookupMessage(json.error || "Membership record was not found.");
      return;
    }
    setMember(json.member);
    setAddress({
      street_address: json.member?.street_address || "",
      suburb: json.member?.suburb || "",
      city: json.member?.city || "",
      postcode: json.member?.postcode || "",
    });
    setLookupMessage(`Membership record found: ${json.member.membership_id || ""} ${json.member.first_name || ""} ${json.member.last_name || ""}`);
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setPaymentUrl("");

    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());

    try {
      const res = await fetch(`/api/tournaments/${tournament.id}/register`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) { setMessage(json.error || "Your registration is not confirmed. If payment was taken, do not pay again; contact info@aucklandknights.co.nz."); return; }
      if (json.url) {
        setPaymentUrl(json.url);
        setMessage(`Entry reference: ${json.registration_id}. Your entry is pending payment. Redirecting to secure checkout...`);
        window.location.href = json.url;
        return;
      }
      if (!json.ok) { setMessage("We could not confirm your entry. Contact the club before registering again."); return; }
      setConfirmed(true);
      setMessage(`${json.message || "Registration confirmed."}${json.registration_id ? ` Entry reference: ${json.registration_id}.` : ""}`);
    } catch {
      setMessage("The connection was interrupted and we could not verify whether your entry was saved. Do not submit or pay again if payment was taken. Contact info@aucklandknights.co.nz so we can check your entry.");
    } finally { setLoading(false); }

  }

  const memberKey = member?.id || "empty";

  return (
    <form onSubmit={submit} className="card p-6">
      <h2 className="text-2xl font-extrabold">{isClubCalendar ? "Enrol for" : "Register for"} {tournament.title}</h2>
      {isClubCalendar ? (
        <div className="mt-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-900">
          <b>Club Calendar Event:</b> active Auckland Knights membership is mandatory. Enter your Membership ID or registered email, click <b>Find Member</b>, then register and pay the tournament entry fee. Membership does not cover tournament fees.
        </div>
      ) : (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <b>Payment required:</b> your tournament entry is <b>not confirmed</b> until Stripe payment is successfully completed.
          If you close or cancel the payment page, your entry will remain as <b>Pending Payment</b> and will not appear in the public entries list.
        </div>
      )}
      {fee > 0 && !paymentAvailable && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-4 text-red-800">Online payment is temporarily unavailable. Contact info@aucklandknights.co.nz to arrange registration.</p>}
      {paymentMode === "test" && <p className="mt-3 font-bold text-amber-800">Test checkout: this does not take a real payment or confirm a live paid entry.</p>}
      <p className="mt-3 text-sm text-slate-600">Current fee: <b>{fee > 0 ? formatMoney(fee) : "Not configured — contact the club"}</b>.</p>

      <p className="mt-4 text-sm"><a href="/join" className="font-bold underline">Join or renew Auckland Knights membership</a></p>
      {isClubCalendar && (
        <div className="mt-5 rounded-xl bg-green-50 p-4">
          <label>
            <span className="label">Membership ID or registered email *</span>
            <div className="mt-1 flex flex-col gap-2 sm:flex-row">
              <input value={memberIdentifier} onChange={(e) => { setMemberIdentifier(e.target.value); setMember(null); }} placeholder="AK01001 or member@email.com" className="input uppercase sm:flex-1" />
              <button type="button" onClick={findMember} disabled={lookupLoading} className="btn-secondary whitespace-nowrap">
                {lookupLoading ? "Finding..." : "Find Member"}
              </button>
            </div>
          </label>
          {lookupMessage && <p className={`mt-3 rounded-lg p-3 text-sm font-bold ${member ? "bg-white text-green-900" : "bg-white text-red-700"}`}>{lookupMessage}</p>}
          {member && (
            <div className="mt-4 rounded-xl border border-green-200 bg-white p-4 text-sm">
              <div className="grid gap-2 sm:grid-cols-2">
                <p><b>Membership ID:</b> {member.membership_id}</p>
                <p><b>Payment:</b> {member.payment_status || "Unknown"}</p>
                <p><b>Status:</b> {member.membership_status || "Unknown"}</p>
                <p><b>Expires:</b> {member.membership_end_date || "TBC"}</p>
                <p><b>Name:</b> {member.first_name} {member.last_name}</p>
                <p><b>Email:</b> {member.email}</p>
                <p><b>Phone:</b> {member.phone || ""}</p>
                <p><b>NZCF:</b> {member.nzcf_id || ""} {member.nzcf_rating ? `(${member.nzcf_rating})` : ""}</p>
                <p><b>FIDE:</b> {member.fide_id || ""} {member.fide_rating ? `(${member.fide_rating})` : ""}</p>
              </div>
              <p className="mt-3 text-xs text-green-800">Please review your details. Club entry requires current active paid or waived membership; unpaid or expired members must complete membership first. Tournament fees are separate.</p>
            </div>
          )}
          <input type="hidden" name="membership_id" value={member?.membership_id || (!memberIdentifier.includes("@") ? memberIdentifier.toUpperCase() : "")} />
          <input type="hidden" name="membership_email" value={member?.email || (memberIdentifier.includes("@") ? memberIdentifier.toLowerCase() : "")} />
        </div>
      )}

      {cats.length > 0 && (
        <div className="mt-5 rounded-xl bg-akcc-pale p-4">
          <label>
            <span className="label">Select Category *</span>
            <select
              name="category_key"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="input mt-1"
              required
            >
              {cats.map((c: any) => (
                <option key={c.key || c.name} value={c.key || c.name}>
                  {c.name} — {formatMoney(Number(c.fee_cents || 0))}
                </option>
              ))}
            </select>
          </label>
          {chosen?.prize && <p className="mt-2 text-sm"><b>Prize:</b> {chosen.prize}</p>}
        </div>
      )}

      <div key={memberKey} className="mt-6 grid gap-4 md:grid-cols-2">
        {[
          ["first_name", "First name *", member?.first_name || ""],
          ["last_name", "Last name *", member?.last_name || ""],
          ["email", "Email *", member?.email || ""],
          ["phone", "Phone *", member?.phone || ""],
          ["date_of_birth", "Date of birth", member?.date_of_birth ? String(member.date_of_birth).slice(0, 10) : ""],
          ["nzcf_id", "NZCF ID", member?.nzcf_id || ""],
          ["nzcf_rating", "NZCF rating", member?.nzcf_rating || ""],
          ["fide_id", "FIDE ID", member?.fide_id || ""],
          ["fide_rating", "FIDE rating", member?.fide_rating || ""],
          ["club_name", "Club name", isClubCalendar ? "Auckland Knights Chess Club" : ""],
          ["school_name", "School name", member?.school || ""],
          ["parent_guardian_name", "Parent/guardian name", `${member?.parent_guardian_first_name || ""} ${member?.parent_guardian_last_name || ""}`.trim()],
          ["parent_guardian_phone", "Parent/guardian phone", member?.parent_guardian_phone || ""],
        ].map(([name, label, defaultValue]) => (
          <label key={name}>
            <span className="label">{label}</span>
            <input
              name={String(name)}
              defaultValue={String(defaultValue || "")}
              type={name === "email" ? "email" : String(name).includes("date") ? "date" : "text"}
              required={String(label).includes("*")}
              className="input mt-1"
            />
          </label>
        ))}
        <AddressAutocomplete onSelect={(v) => setAddress({ street_address: v.street_address, suburb: v.suburb, city: v.city, postcode: v.postcode })} />
        <label><span className="label">Street Address</span><input name="street_address" value={address.street_address} onChange={(e) => setAddress({ ...address, street_address: e.target.value })} className="input mt-1" /></label>
        <label><span className="label">Suburb</span><input name="suburb" value={address.suburb} onChange={(e) => setAddress({ ...address, suburb: e.target.value })} className="input mt-1" /></label>
        <label><span className="label">Town / City</span><input name="city" value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} className="input mt-1" /></label>
        <label><span className="label">Postcode</span><input name="postcode" value={address.postcode} onChange={(e) => setAddress({ ...address, postcode: e.target.value })} className="input mt-1" /></label>
        <label className="md:col-span-2 flex items-center gap-2 text-sm">
          <input name="consent" type="checkbox" required /> I confirm the registration details are accurate and agree to tournament communication.
        </label>
      </div>

      {message && <p role="status" aria-live="polite" className="mt-4 rounded-lg bg-slate-50 p-3 text-sm font-bold text-slate-800">{message}</p>}
      {paymentUrl && (
        <a href={paymentUrl} className="btn-secondary mt-4" target="_self">
          Open payment page
        </a>
      )}
      <button disabled={loading || confirmed || fee <= 0 || (fee > 0 && !paymentAvailable) || (isClubCalendar && !member)} className="btn-primary mt-6">
        {confirmed ? "Registration Confirmed" : loading ? "Submitting..." : "Continue to Payment"}
      </button>
      {isClubCalendar && !member && <p className="mt-2 text-xs text-slate-500">Use Find Member first so the form can populate active membership details.</p>}
    </form>
  );
}
