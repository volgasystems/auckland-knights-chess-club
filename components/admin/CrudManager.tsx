"use client";

import { useState } from "react";
import RichTextEditor from "@/components/admin/RichTextEditor";
import ContentPreview from "@/components/admin/ContentPreview";
import { CONTENT_PREVIEW_TABLES } from "@/lib/contentEditing";
import ImageCropUpload from "@/components/ImageCropUpload";
import AddressAutocomplete from "@/components/AddressAutocomplete";

type Field = {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  options?: string[];
  choices?: { value: string; label: string }[];
  textarea?: boolean;
  imageBucket?: string;
  help?: string;
  placeholder?: string;
};

type CategoryRow = { key: string; name: string; fee_cents: number | string; max_players?: number | string; prize?: string; __money_is_dollars?: boolean };
type PrizeRow = { position: string; category: string; prize: string; amount_cents?: number | string; __money_is_dollars?: boolean };

function centsToDollars(value: any) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? String((n / 100).toFixed(n % 100 === 0 ? 0 : 2)) : "";
}
function dollarsToCents(value: any) {
  if (value === null || value === undefined || value === "") return 0;
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

function toInputDateTime(value: any) {
  if (!value) return "";
  if (typeof value === "string" && value.length === 16 && value.includes("T")) return value;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function initialValue(field: Field) {
  if (field.type === "checkbox") return false;
  if (field.type === "json") return "[]";
  if (field.type === "categories") return [];
  if (field.type === "prizes") return [];
  if (field.type === "multi_options") return [];
  return "";
}
function normaliseCategoryRows(value: any): CategoryRow[] {
  if (!Array.isArray(value)) return [];
  return value.map((row: any, index) => ({
    key: row.key || String(row.name || `category_${index + 1}`).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || `category_${index + 1}`,
    name: row.name || "",
    fee_cents: row.__money_is_dollars ? (row.fee_cents ?? 0) : (row.fee_dollars ?? row.fee_amount ?? (row.fee_cents !== undefined && row.fee_cents !== null ? centsToDollars(row.fee_cents) : 0)),
    __money_is_dollars: true,
    max_players: row.max_players ?? "",
    prize: row.prize || row.prize_details || "",
  }));
}
function normalisePrizeRows(value: any): PrizeRow[] {
  if (!Array.isArray(value)) return [];
  return value.map((row: any) => ({
    position: row.position || row.rank || "",
    category: row.category || "",
    prize: row.prize || row.prize_details || "",
    amount_cents: row.__money_is_dollars ? (row.amount_cents ?? "") : (row.amount_dollars ?? row.amount ?? (row.amount_cents !== undefined && row.amount_cents !== null && row.amount_cents !== "" ? centsToDollars(row.amount_cents) : "")),
    __money_is_dollars: true,
  }));
}

function CategoryEditor({ value, onChange }: { value: CategoryRow[]; onChange: (rows: CategoryRow[]) => void }) {
  const rows = normaliseCategoryRows(value);
  function update(index: number, patch: Partial<CategoryRow>) { onChange(rows.map((r, i) => (i === index ? { ...r, ...patch } : r))); }
  function add() { onChange([...rows, { key: "", name: "", fee_cents: 0, max_players: "", prize: "" }]); }
  function remove(index: number) { onChange(rows.filter((_, i) => i !== index)); }
  return <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><span className="admin-label">Tournament Categories and Entry Fees</span><p className="mt-1 text-xs text-slate-600">Add one row per category. This replaces the old JSON field.</p></div><button type="button" onClick={add} className="btn-secondary py-2">+ Add Category</button></div>
    {rows.length === 0 ? <p className="mt-4 rounded-lg bg-white p-3 text-sm text-slate-600">No categories added. The default entry fee will be used.</p> : <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-white"><table className="w-full min-w-[860px] text-sm"><thead className="bg-slate-100 text-left"><tr><th className="p-3">Category key</th><th className="p-3">Category name</th><th className="p-3">Fee ($)</th><th className="p-3">Max players</th><th className="p-3">Prize notes</th><th className="p-3">Action</th></tr></thead><tbody>{rows.map((row, index) => <tr key={index} className="border-t align-top"><td className="p-3"><input value={row.key} onChange={(e) => update(index, { key: e.target.value })} placeholder="open" className="admin-input" /><p className="mt-1 text-xs text-slate-500">No spaces. Example: junior_u12</p></td><td className="p-3"><input value={row.name} onChange={(e) => update(index, { name: e.target.value })} placeholder="Open / Junior U12" className="admin-input" /></td><td className="p-3"><input type="number" min="0" step="0.01" value={row.fee_cents} onChange={(e) => update(index, { fee_cents: e.target.value })} placeholder="25" className="admin-input" /><p className="mt-1 text-xs text-slate-500">Enter dollars, e.g. 25 for $25.00</p></td><td className="p-3"><input type="number" min="0" value={row.max_players || ""} onChange={(e) => update(index, { max_players: e.target.value })} placeholder="Optional" className="admin-input" /></td><td className="p-3"><textarea value={row.prize || ""} onChange={(e) => update(index, { prize: e.target.value })} placeholder="Trophies for top 3" className="admin-input" rows={3} /></td><td className="p-3"><button type="button" onClick={() => remove(index)} className="font-bold text-red-700">Remove</button></td></tr>)}</tbody></table></div>}
  </div>;
}

function PrizeEditor({ value, onChange }: { value: PrizeRow[]; onChange: (rows: PrizeRow[]) => void }) {
  const rows = normalisePrizeRows(value);
  function update(index: number, patch: Partial<PrizeRow>) { onChange(rows.map((r, i) => (i === index ? { ...r, ...patch } : r))); }
  function add() { onChange([...rows, { position: "", category: "", prize: "", amount_cents: "" }]); }
  function remove(index: number) { onChange(rows.filter((_, i) => i !== index)); }
  return <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><span className="admin-label">Prize Fund / Winners</span><p className="mt-1 text-xs text-slate-600">Click Add Prize for each prize. Useful when each tournament has different prizes.</p></div><button type="button" onClick={add} className="btn-gold py-2">+ Add Prize</button></div>
    {rows.length === 0 ? <p className="mt-4 rounded-lg bg-white p-3 text-sm text-slate-600">No prize rows added yet.</p> : <div className="mt-4 overflow-x-auto rounded-lg border border-amber-200 bg-white"><table className="w-full min-w-[760px] text-sm"><thead className="bg-amber-100 text-left"><tr><th className="p-3">Position / Award</th><th className="p-3">Category</th><th className="p-3">Prize description</th><th className="p-3">Amount ($) optional</th><th className="p-3">Action</th></tr></thead><tbody>{rows.map((row, index) => <tr key={index} className="border-t align-top"><td className="p-3"><input value={row.position} onChange={(e) => update(index, { position: e.target.value })} placeholder="1st / Best Junior" className="admin-input" /></td><td className="p-3"><input value={row.category} onChange={(e) => update(index, { category: e.target.value })} placeholder="Open / Junior U12" className="admin-input" /></td><td className="p-3"><input value={row.prize} onChange={(e) => update(index, { prize: e.target.value })} placeholder="$300 / Trophy / Medal" className="admin-input" /></td><td className="p-3"><input type="number" min="0" step="0.01" value={row.amount_cents || ""} onChange={(e) => update(index, { amount_cents: e.target.value })} placeholder="300" className="admin-input" /></td><td className="p-3"><button type="button" onClick={() => remove(index)} className="font-bold text-red-700">Remove</button></td></tr>)}</tbody></table></div>}
  </div>;
}

function MultiOptions({ field, value, onChange }: { field: Field; value: string[]; onChange: (value: string[]) => void }) {
  const selected = Array.isArray(value) ? value : [];
  function toggle(option: string) { onChange(selected.includes(option) ? selected.filter((x) => x !== option) : [...selected, option]); }
  return <div className="rounded-xl border border-stone-200 bg-stone-50 p-4"><span className="admin-label">{field.label}</span>{field.help && <p className="mt-1 text-xs text-slate-600">{field.help}</p>}<div className="mt-3 flex flex-wrap gap-3">{(field.options || []).map((option) => <label key={option} className="flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-semibold shadow-sm"><input type="checkbox" checked={selected.includes(option)} onChange={() => toggle(option)} />{option}</label>)}</div></div>;
}

export default function CrudManager({ table, title, fields, rows, meetingLabels, initialValues = {} }: { table: string; title: string; fields: Field[]; rows: any[]; meetingLabels?: Record<string, string>; initialValues?: Record<string, any> }) {
  const empty = { ...Object.fromEntries(fields.map((f) => [f.name, initialValue(f)])), ...initialValues };
  const [form, setForm] = useState<any>(empty);
  const [editing, setEditing] = useState<any>(null);
  const [previewData,setPreviewData]=useState<any>(null);
  const [previewSave,setPreviewSave]=useState(false);
  const needsPreview=CONTENT_PREVIEW_TABLES.includes(table);
  const publishLabel=form.is_published || form.publish_as_news ? "Save & Publish" : "Save changes";
  const [loading, setLoading] = useState(false);

  function edit(row: any) {
    const next: any = { ...empty, ...row };
    fields.forEach((f) => {
      if (f.type === "datetime-local") next[f.name] = toInputDateTime(row[f.name]);
      if (f.type === "date" && row[f.name]) next[f.name] = String(row[f.name]).slice(0, 10);
      if (f.type === "money" && row[f.name] !== null && row[f.name] !== undefined) next[f.name] = centsToDollars(row[f.name]);
      if (f.type === "json") next[f.name] = JSON.stringify(row[f.name] || [], null, 2);
      if (f.type === "categories") next[f.name] = normaliseCategoryRows(row[f.name] || []);
      if (f.type === "prizes") next[f.name] = normalisePrizeRows(row[f.name] || []);
      if (f.type === "multi_options") next[f.name] = Array.isArray(row[f.name]) ? row[f.name] : [];
    });
    setEditing(row.id); setForm(next); window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save(e?: React.FormEvent, reviewed=false) {
    e?.preventDefault();
    if(needsPreview && !reviewed) {setPreviewData({...form});setPreviewSave(true);return;}
    setLoading(true);
    const payload: any = { ...form };
    for (const f of fields) {
      if (f.type === "datetime-local" && payload[f.name]) payload[f.name] = new Date(payload[f.name]).toISOString();
      if (f.type === "number" && payload[f.name] !== "" && payload[f.name] !== null) payload[f.name] = Number(payload[f.name]);
      if (f.type === "money" && payload[f.name] !== "" && payload[f.name] !== null) payload[f.name] = dollarsToCents(payload[f.name]);
      if (f.type === "json") { try { payload[f.name] = payload[f.name] ? JSON.parse(payload[f.name]) : []; } catch { setLoading(false); alert(`${f.label} must be valid JSON.`); return; } }
      if (f.type === "categories") payload[f.name] = normaliseCategoryRows(payload[f.name]).filter((c) => c.name.trim()).map((c) => ({ key: c.key || c.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""), name: c.name, fee_cents: dollarsToCents(c.fee_cents), max_players: c.max_players ? Number(c.max_players) : null, prize: c.prize || "" }));
      if (f.type === "prizes") payload[f.name] = normalisePrizeRows(payload[f.name]).filter((p) => p.position.trim() || p.prize.trim()).map((p) => ({ position: p.position, category: p.category, prize: p.prize, amount_cents: p.amount_cents ? dollarsToCents(p.amount_cents) : null }));
      if (f.type === "multi_options") payload[f.name] = Array.isArray(payload[f.name]) ? payload[f.name] : [];
    }
    const res = await fetch("/api/admin/crud", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ table, action: editing ? "update" : "create", id: editing, payload }) });
    const json = await res.json(); setLoading(false); if (!res.ok) return alert(json.error || "Save failed"); window.location.reload();
  }
  async function del(id: string) {
    if (!confirm("Delete this record?")) return;
    const res = await fetch("/api/admin/crud", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ table, action: "delete", id }) });
    if (!res.ok) alert("Delete failed"); else window.location.reload();
  }

  function renderField(f: Field) {
    if (["richtext","caption"].includes(f.type || "")) return <RichTextEditor label={f.label} required={f.required} value={form[f.name] || ""} plain={f.type === "caption"} onChange={value=>setForm({...form,[f.name]:value})}/>;
    if (f.type === "image") return <ImageCropUpload label={f.label} bucket={f.imageBucket || "news-images"} value={form[f.name]} onChange={(url) => setForm({ ...form, [f.name]: url })} />;
    if (f.type === "categories") return <CategoryEditor value={form[f.name] || []} onChange={(rows) => setForm({ ...form, [f.name]: rows })} />;
    if (f.type === "prizes") return <PrizeEditor value={form[f.name] || []} onChange={(rows) => setForm({ ...form, [f.name]: rows })} />;
    if (f.type === "multi_options") return <MultiOptions field={f} value={form[f.name] || []} onChange={(value) => setForm({ ...form, [f.name]: value })} />;
    if (f.type === "address") return <div><label><span className="admin-label">{f.label}</span>{f.help && <p className="mt-1 text-xs text-slate-500">{f.help}</p>}<textarea value={form[f.name] || ""} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} rows={2} className="admin-input mt-1" /></label><div className="mt-3"><AddressAutocomplete onSelect={(v) => setForm({ ...form, [f.name]: v.display })} /></div></div>;
    if (f.textarea || f.type === "json") return <label><span className="admin-label">{f.label}</span>{f.help && <p className="mt-1 text-xs text-slate-500">{f.help}</p>}<textarea value={form[f.name] || ""} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} required={f.required} rows={f.type === "json" ? 8 : 5} className="admin-input mt-1 font-mono" /></label>;
    if (f.choices) return <label><span className="admin-label">{f.label}</span><select value={form[f.name] || ""} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} required={f.required} className="admin-input mt-1"><option value="">{f.placeholder || "Select"}</option>{f.choices.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>;
    if (f.options) return <label><span className="admin-label">{f.label}</span>{f.help && <p className="mt-1 text-xs text-slate-500">{f.help}</p>}<select value={form[f.name] || ""} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} required={f.required} className="admin-input mt-1"><option value="">Select</option>{f.options.map((o) => <option key={o} value={o}>{o}</option>)}</select></label>;
    if (f.type === "money") return <label><span className="admin-label">{f.label}</span>{f.help && <p className="mt-1 text-xs text-slate-500">{f.help}</p>}<div className="mt-1 flex items-center rounded-lg border border-slate-300 bg-white px-3 focus-within:border-akcc-gold focus-within:ring-2 focus-within:ring-akcc-gold/20"><span className="mr-2 text-sm font-bold text-slate-500">$</span><input value={form[f.name] || ""} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} required={f.required} type="number" min="0" step="0.01" className="w-full bg-transparent py-2 text-sm outline-none" /></div></label>;
    if (f.type === "checkbox") return <label className="mt-6 flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={!!form[f.name]} onChange={(e) => setForm({ ...form, [f.name]: e.target.checked })} /> {f.label}{f.help && <span className="text-xs font-normal text-slate-500">{f.help}</span>}</label>;
    return <label><span className="admin-label">{f.label}</span>{f.help && <p className="mt-1 text-xs text-slate-500">{f.help}</p>}<input value={form[f.name] || ""} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} required={f.required} type={f.type || "text"} className="admin-input mt-1" /></label>;
  }

  return <div><h1 className="mb-6 text-3xl font-extrabold">{title}</h1><form onSubmit={e=>save(e)} className="card mb-8 p-6">{editing && <div className="mb-5 rounded-lg bg-amber-50 p-3 text-sm font-semibold text-amber-800">Editing existing item. Review and save your changes.</div>}<div className="grid gap-4 md:grid-cols-2">{fields.map((f) => <div key={f.name} className={f.textarea || ["richtext", "caption", "image", "json", "categories", "prizes", "multi_options", "address"].includes(f.type || "") ? "md:col-span-2" : ""}>{renderField(f)}</div>)}</div><div className="mt-6 flex flex-wrap gap-2">{needsPreview && <button type="button" className="btn-secondary" onClick={()=>{setPreviewData({...form});setPreviewSave(false);}}>Preview</button>}<button disabled={loading} className="btn-primary">{loading ? "Saving..." : needsPreview ? "Review & Save" : editing ? "Update" : "Add"}</button>{editing && <button type="button" onClick={() => { setEditing(null); setForm(empty); }} className="btn-secondary">Cancel</button>}</div></form><div className="card overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-100 text-left"><tr>{table === "payment_accounts" ? <><th className="p-3">Code / usage</th><th className="p-3">Account number</th><th className="p-3">Purpose</th></> : <th className="p-3">Image</th>}<th className="p-3">Title/Name</th><th className="p-3">Status</th><th className="p-3">Updated</th><th className="p-3">Actions</th></tr></thead><tbody>{rows.map((r: any) => <tr key={r.id} className="border-t">{table === "payment_accounts" ? <><td className="p-3">{r.code}</td><td className="p-3 whitespace-nowrap">{r.account_number}</td><td className="p-3">{r.purpose}</td></> : <td className="p-3">{(r.image_url || r.winner_photo_url || r.photo_url || r.image) ? <img src={r.image_url || r.winner_photo_url || r.photo_url || r.image} alt="" className="h-12 w-16 rounded object-cover" /> : <span className="text-slate-400">—</span>}</td>}<td className="p-3 font-bold">{r.title || r.person_name || r.name || r.question || r.player_first_name || r.club_name || r.email || r.template_key || r.id}{meetingLabels && <div className="mt-1 text-xs font-normal text-slate-600">{meetingLabels[r.meeting_id]}{r.role_title ? ` · ${r.role_title}` : ""}</div>}</td><td className="p-3">{String(table === "payment_accounts" ? (r.is_active ? "Active" : "Inactive") : r.status || r.role || r.outcome || (meetingLabels ? "Saved" : "") || (r.is_published ? "Published" : "Draft") || r.payment_status || "")}</td><td className="p-3">{r.updated_at || r.created_at || ""}</td><td className="p-3">{needsPreview && <button type="button" className="mr-2 font-bold" onClick={()=>{setPreviewData(r);setPreviewSave(false);}}>Preview</button>}<button onClick={() => edit(r)} className="mr-2 font-bold text-black">Edit</button><button onClick={() => del(r.id)} className="font-bold text-red-700">Delete</button></td></tr>)}</tbody></table></div>{previewData && <ContentPreview data={previewData} fields={table === "elected_team_members" ? fields.filter(f=>!["email","phone","notes"].includes(f.name)) : fields} busy={loading} saveLabel={publishLabel} onClose={()=>setPreviewData(null)} onSave={previewSave ? ()=>save(undefined,true) : undefined}/>}</div>;
}
