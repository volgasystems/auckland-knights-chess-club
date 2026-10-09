"use client";
import MembershipNumbering from "@/components/admin/MembershipNumbering";
import { useState } from "react";
import AddressAutocomplete from "@/components/AddressAutocomplete";

type Settings = Record<string, any>;
const text = (v: any) => v || "";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label><span className="admin-label">{label}</span>{children}</label>;
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft"><h2 className="mb-4 text-xl font-extrabold text-akcc-blue">{title}</h2><div className="grid gap-4 md:grid-cols-2">{children}</div></section>;
}

export default function SettingsManager({ initial }: { initial: Settings | null }) {
  const [form, setForm] = useState<Settings>({
    id: "default",
    club_name: "Auckland Knights Chess Club",
    club_address: "East Auckland / South Auckland, New Zealand",
    general_email: "info@aucklandknights.co.nz",
    status: "draft",
    is_published: false,
    membership_id_prefix: "AKCC",
    email_provider: "smtp",
    smtp_host: "smtp-relay.brevo.com",
    smtp_port: "587",
    smtp_secure: false,
    club_from_name: "Auckland Knights Chess Club",
    ...initial,
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  function update(name: string, value: any) { setForm((f) => ({ ...f, [name]: value })); }
  async function save(publish = false) {
    setLoading(true); setMessage("");
    const payload = { ...form, id: "default", status: publish ? "published" : "draft", is_published: publish };
    const res = await fetch("/api/admin/crud", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ table: "club_settings", action: initial ? "update" : "create", id: "default", payload }) });
    const json = await res.json(); setLoading(false);
    if (!res.ok) { setMessage(json.error || "Save failed"); return; }
    setForm(json.data || payload); setMessage(publish ? "Settings published. Public pages will use these values." : "Draft saved.");
  }
  const input = (name: string, type = "text") => <input value={text(form[name])} onChange={(e) => update(name, e.target.value)} type={type} className="admin-input mt-1" />;
  const textarea = (name: string, rows = 3) => <textarea value={text(form[name])} onChange={(e) => update(name, e.target.value)} rows={rows} className="admin-input mt-1" />;
  const select = (name: string, options: { value: string; label: string }[]) => <select value={text(form[name])} onChange={(e) => update(name, e.target.value)} className="admin-input mt-1">{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>;
  const checkbox = (name: string) => <label className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-700"><input type="checkbox" checked={Boolean(form[name])} onChange={(e) => update(name, e.target.checked)} /> Yes</label>;
  return <div><div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-extrabold">Club Settings</h1><p className="mt-1 text-sm text-slate-600">Status: <b className={form.is_published ? "text-green-700" : "text-amber-700"}>{form.is_published ? "Published" : "Draft"}</b></p></div><div className="flex gap-2"><button disabled={loading} onClick={() => save(false)} className="btn-secondary">Save Draft</button><button disabled={loading} onClick={() => save(true)} className="btn-primary">Publish Settings</button></div></div>{message && <div className="mb-5 rounded-lg bg-blue-50 p-3 text-sm font-bold text-akcc-blue">{message}</div>}<MembershipNumbering initial={initial} /><div className="space-y-6">
    <Section title="Club Basic Details"><Field label="Club name">{input("club_name")}</Field><Field label="General contact email">{input("general_email", "email")}</Field></Section>
    <Section title="Club Address & Map"><div className="md:col-span-2"><Field label="Club address used for map">{textarea("club_address", 2)}</Field><div className="mt-3"><AddressAutocomplete onSelect={(v) => update("club_address", v.display)} /></div><p className="mt-2 text-xs text-slate-500">When published, the home/contact map will update automatically from this address.</p></div></Section>
    <Section title="Senior Club Captain Details"><Field label="Senior Club Captain Name">{input("senior_club_captain_name")}</Field><Field label="Senior Club Captain Phone">{input("senior_club_captain_phone")}</Field><Field label="Senior Club Captain Email">{input("senior_club_captain_email", "email")}</Field></Section>
    <Section title="Junior Club Captain Details"><Field label="Junior Club Captain Name">{input("junior_club_captain_name")}</Field><Field label="Junior Club Captain Phone">{input("junior_club_captain_phone")}</Field><Field label="Junior Club Captain Email">{input("junior_club_captain_email", "email")}</Field></Section>
    <Section title="Schedules"><div className="md:col-span-2"><Field label="Main Club Schedule">{textarea("main_club_schedule", 4)}</Field></div><div className="md:col-span-2"><Field label="Junior Club Schedule">{textarea("junior_club_schedule", 4)}</Field></div></Section>
    <Section title="Social Media Links"><Field label="Facebook URL">{input("facebook_url")}</Field><Field label="Instagram URL">{input("instagram_url")}</Field><Field label="YouTube URL">{input("youtube_url")}</Field><Field label="X / Twitter URL">{input("x_url")}</Field><Field label="Lichess profile/team URL">{input("lichess_url")}</Field><Field label="LinkedIn URL">{input("linkedin_url")}</Field></Section>
    <Section title="Email Provider Settings"><Field label="Email Provider">{select("email_provider", [{value:"disabled",label:"Disabled"},{value:"resend",label:"Resend API"},{value:"smtp",label:"SMTP / Brevo / Custom SMTP"}])}<p className="mt-1 text-xs text-slate-500">Choose which provider should send membership notices, absence emails and bulk email.</p></Field><Field label="From Email">{input("club_from_email", "email")}</Field><Field label="From Name">{input("club_from_name")}</Field><Field label="Reply-to Email">{input("club_reply_to_email", "email")}</Field><div className="md:col-span-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">These values can also be supplied in environment variables. If entered here, the website will use the published Club Settings. Keep API keys private and only allow trusted Super Admin/Admin users to edit settings.</div></Section>
    <Section title="Resend API Settings"><Field label="Resend API Key">{input("resend_api_key", "password")}</Field><div className="md:col-span-2 text-xs text-slate-500">Use this only if Email Provider is set to Resend API.</div></Section>
    <Section title="SMTP / Brevo Settings"><Field label="SMTP Host">{input("smtp_host")}</Field><Field label="SMTP Port">{input("smtp_port", "number")}</Field><Field label="SMTP Secure">{checkbox("smtp_secure")}</Field><Field label="SMTP Username">{input("smtp_user")}</Field><Field label="SMTP Password">{input("smtp_pass", "password")}</Field><div className="md:col-span-2 text-xs text-slate-500">For Brevo free SMTP use host smtp-relay.brevo.com, port 587 and SMTP Secure = No.</div></Section>
  </div></div>;
}
