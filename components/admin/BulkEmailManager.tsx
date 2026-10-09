"use client";

import { useEffect, useMemo, useState } from "react";

type Template = { id: string; name: string; subject: string; body: string; template_key: string };
type Member = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  membership_id?: string;
  membership_status?: string;
  membership_end_date?: string;
  payment_status?: string;
  stripe_payment_intent_id?: string;
  membership_options?: any[];
};
type ProviderStatus = { configured: boolean; providerLabel: string; fromEmail?: string; smtpHost?: string; missing?: string[] };

const targetGroups = [
  ["active", "Active members"],
  ["paid", "All paid members"],
  ["expired", "Expired members"],
  ["expiring_soon", "Members expiring soon"],
  ["all", "All members"],
  ["selected", "Selected individual members"],
];

function normalise(value: any) { return String(value || "").trim().toLowerCase(); }
function isPaid(m: Member) {
  const p = normalise(m.payment_status);
  return ["paid", "complete", "completed", "confirmed"].includes(p) || Boolean(m.stripe_payment_intent_id);
}
function isExpired(m: Member, now = new Date()) {
  const status = normalise(m.membership_status);
  if (["expired", "inactive", "cancelled", "deleted", "archived"].includes(status)) return true;
  return Boolean(m.membership_end_date && new Date(m.membership_end_date) < now);
}
function isActiveMember(m: Member, now = new Date()) {
  const status = normalise(m.membership_status);
  if (isExpired(m, now)) return false;
  return status === "active" || isPaid(m);
}
function fullName(m: Member) { return `${m.first_name || ""} ${m.last_name || ""}`.trim() || m.email; }

export default function BulkEmailManager({ templates, members, providerStatus, tournaments = [] }: { tournaments?: {id:string;title:string}[]; templates: Template[]; members: Member[]; providerStatus?: ProviderStatus }) {
  const [tournamentId, setTournamentId] = useState("");
  const [previewAction, setPreviewAction] = useState("");
  const [templateId, setTemplateId] = useState(templates[0]?.id || "");
  const [targetGroup, setTargetGroup] = useState("active");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [customMessage, setCustomMessage] = useState("");
  const [preview, setPreview] = useState<any>(null);
  const [testEmail, setTestEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedTemplate = templates.find((t) => t.id === templateId);
  const needsTournament = !!selectedTemplate && (/{{\s*tournament_(name|title)\s*}}/.test(`${selectedTemplate.subject} ${selectedTemplate.body}`) || ["calendar_registration","general_tournament_paid"].includes(selectedTemplate.template_key));
  useEffect(() => { setPreview(null); setPreviewAction(""); }, [templateId,tournamentId,targetGroup,selectedIds,customMessage]);
  const usableMembers = useMemo(() => members.filter((m) => String(m.email || "").includes("@")), [members]);

  const filteredMembers = useMemo(() => {
    const now = new Date();
    const soon = new Date(); soon.setDate(soon.getDate() + 45);
    if (targetGroup === "all") return usableMembers;
    if (targetGroup === "selected") return usableMembers.filter((m) => selectedIds.includes(m.id));
    if (targetGroup === "active") return usableMembers.filter((m) => isActiveMember(m, now));
    if (targetGroup === "paid") return usableMembers.filter((m) => isPaid(m));
    if (targetGroup === "expired") return usableMembers.filter((m) => isExpired(m, now));
    if (targetGroup === "expiring_soon") return usableMembers.filter((m) => isActiveMember(m, now) && m.membership_end_date && new Date(m.membership_end_date) >= now && new Date(m.membership_end_date) <= soon);
    return usableMembers;
  }, [usableMembers, selectedIds, targetGroup]);

  async function call(action: "preview" | "send" | "test") {
    if (!templateId) return alert("Please select an email template.");
    if (action === "test") { if (!testEmail.includes("@")) return alert("Please enter a test email address."); }
    else if (!filteredMembers.length) return alert("No recipients matched. Try All members, All paid members or Selected individual members, or check member statuses.");
    if (action === "send" && needsTournament && !tournamentId) return alert("Select a tournament first.");
    if (action === "send" && (previewAction !== "preview" || !preview?.recipient_count)) return alert("Preview matching recipients before sending.");
    if (action === "send" && !confirm(`Send email to ${preview.recipient_count} recipients?`)) return;
    setLoading(true);
    const res = await fetch("/api/admin/bulk-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, tournament_id: needsTournament ? tournamentId : undefined, template_id: templateId, target_group: targetGroup, selected_ids: selectedIds, custom_message: customMessage, test_email: testEmail }),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) return alert(json.error || "Bulk email failed");
    setPreview(json); setPreviewAction(action);
  }

  function toggle(id: string) { setSelectedIds((ids) => ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]); }
  function selectAllVisible() { setSelectedIds(Array.from(new Set([...selectedIds, ...usableMembers.map((m) => m.id)]))); }
  function clearSelected() { setSelectedIds([]); }

  const configured = providerStatus?.configured;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold">Bulk Email</h1>
        <p className="mt-2 text-sm text-slate-600">Choose a template, choose recipients, preview personalised content, then send using Resend or Brevo SMTP.</p>
      </div>

      <div className={`rounded-2xl border p-4 text-sm ${configured ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
        <b>Email provider:</b> {providerStatus?.providerLabel || "Not configured"}
        {providerStatus?.fromEmail ? <span> · <b>From:</b> {providerStatus.fromEmail}</span> : null}
        {providerStatus?.smtpHost ? <span> · <b>SMTP:</b> {providerStatus.smtpHost}</span> : null}
        {!configured ? <p className="mt-1">Sending is disabled until email settings are configured. You can still preview recipients/templates. For Brevo Free SMTP use EMAIL_PROVIDER=smtp, SMTP_HOST=smtp-relay.brevo.com, SMTP_PORT=587, SMTP_USER, SMTP_PASS, and CLUB_FROM_EMAIL.</p> : null}
      </div>

      <div className="card p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <label>
            <span className="admin-label">Email Template</span>
            <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} className="admin-input mt-1">
              <option value="">Select template</option>
              {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
          <label>
            <span className="admin-label">Recipients</span>
            <select value={targetGroup} onChange={(e) => setTargetGroup(e.target.value)} className="admin-input mt-1">
              {targetGroups.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          {needsTournament && <label className="md:col-span-2"><span className="admin-label">Tournament</span><select value={tournamentId} onChange={e=>setTournamentId(e.target.value)} className="admin-input mt-1"><option value="">Select tournament</option>{tournaments.map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select><p className="mt-2 text-sm text-slate-600">Confirmation emails go only to matching members with confirmed, paid registrations for this tournament. Preview shows the verified recipient count. Without a tournament, tests use sample details.</p></label>}
          <label className="md:col-span-2">
            <span className="admin-label">Optional custom message for {'{{message}}'} placeholder</span>
            <textarea value={customMessage} onChange={(e) => setCustomMessage(e.target.value)} rows={4} className="admin-input mt-1" />
          </label>
        </div>

        {targetGroup === "selected" && (
          <div className="mt-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-bold">Select individual members</p>
              <div className="flex gap-2">
                <button type="button" onClick={selectAllVisible} className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-bold">Select all</button>
                <button type="button" onClick={clearSelected} className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-bold">Clear</button>
              </div>
            </div>
            <div className="max-h-80 overflow-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 text-left"><tr><th className="p-3">Select</th><th className="p-3">Member</th><th className="p-3">Email</th><th className="p-3">Membership ID</th><th className="p-3">Status</th><th className="p-3">Payment</th></tr></thead>
                <tbody>{usableMembers.map((m) => <tr key={m.id} className="border-t"><td className="p-3"><input type="checkbox" checked={selectedIds.includes(m.id)} onChange={() => toggle(m.id)} /></td><td className="p-3 font-semibold">{fullName(m)}</td><td className="p-3">{m.email}</td><td className="p-3">{m.membership_id || "—"}</td><td className="p-3">{m.membership_status || "—"}</td><td className="p-3">{m.payment_status || "—"}</td></tr>)}</tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-5 grid gap-3 rounded-lg bg-stone-50 p-4 text-sm md:grid-cols-3">
          <div><b>Total members with email:</b> {usableMembers.length}</div>
          <div><b>Members matching group:</b> {filteredMembers.length}</div>
          <div><b>Template:</b> {selectedTemplate?.name || "Not selected"}</div>
        </div>

        {filteredMembers.length ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-bold">Recipient preview</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {filteredMembers.slice(0, 20).map((m) => <span key={m.id} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{fullName(m)} · {m.email}</span>)}
              {filteredMembers.length > 20 ? <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">+{filteredMembers.length - 20} more</span> : null}
            </div>
          </div>
        ) : null}

        <div className="mt-5 rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-sm font-bold">Send a test email first</p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input value={testEmail} onChange={(e)=>setTestEmail(e.target.value)} placeholder="test@example.com" className="admin-input" />
            <button type="button" disabled={loading || !configured} onClick={() => call("test")} className="btn-secondary whitespace-nowrap">Send Test Email</button>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" disabled={loading} onClick={() => call("preview")} className="btn-secondary">Preview Email</button>
          <button type="button" disabled={loading || !configured || previewAction !== "preview" || !preview?.recipient_count || (needsTournament && !tournamentId)} onClick={() => call("send")} className="btn-primary">Send Bulk Email</button>
        </div>
      </div>

      {preview && <div className="card p-6"><h2 className="text-xl font-extrabold">Preview / Result</h2><p className="mt-2 text-sm"><b>Recipients:</b> {preview.recipient_count}</p>{preview.sent_count !== undefined && <p className="text-sm"><b>Sent:</b> {preview.sent_count}</p>}{preview.notice_id && <p className="text-sm"><b>Notice ID:</b> {preview.notice_id}</p>}<div className="mt-4 rounded-xl border border-slate-200 bg-white p-4"><p className="font-bold">Subject</p><p className="mt-1">{preview.subject}</p><p className="mt-4 font-bold">Sample personalised body</p><pre className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm">{preview.sample_body}</pre></div>{preview.recipients?.length ? <div className="mt-4 overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-100"><tr><th className="p-3 text-left">Name</th><th className="p-3 text-left">Email</th><th className="p-3 text-left">Membership ID</th><th className="p-3 text-left">Status</th></tr></thead><tbody>{preview.recipients.slice(0, 100).map((r:any) => <tr key={r.email} className="border-t"><td className="p-3">{r.full_name}</td><td className="p-3">{r.email}</td><td className="p-3">{r.membership_id || "—"}</td><td className="p-3">{r.membership_status || r.payment_status || "—"}</td></tr>)}</tbody></table></div> : null}</div>}
    </div>
  );
}
