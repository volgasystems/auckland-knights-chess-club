import { applyMemberSearch } from "@/lib/memberSearch";
import MemberPaymentCheck from "@/components/admin/MemberPaymentCheck";
import { activateMembership } from "@/lib/membershipPayment";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { formatMoney } from "@/lib/format";
import { REPORT_COLUMNS, selectedColumnKeys, selectedColumns, buildReportQuery, buildReportPageQuery } from "@/lib/reports";

function formBase(sp: any) {
  return { sort: sp.sort, payment_status: sp.payment_status, membership_type: sp.membership_type, search: sp.search, membership_status: sp.membership_status, reference: sp.reference };
}

async function updateMemberAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin("members");
  if (admin.profile.role !== "super_admin") throw new Error("Only Super Admin can edit members.");
  const id = String(formData.get("id") || "");
  const payload: any = {
    first_name: String(formData.get("first_name") || ""),
    last_name: String(formData.get("last_name") || ""),
    email: String(formData.get("email") || ""),
    phone: String(formData.get("phone") || ""),
    membership_status: String(formData.get("membership_status") || "active"),
    payment_status: String(formData.get("payment_status") || "paid"),
    membership_start_date: String(formData.get("membership_start_date") || "") || null,
    membership_end_date: String(formData.get("membership_end_date") || "") || null,
    nzcf_id: String(formData.get("nzcf_id") || ""),
    fide_id: String(formData.get("fide_id") || ""),
    updated_at: new Date().toISOString(),
  };
  const nzcfRating = String(formData.get("nzcf_rating") || "");
  const fideRating = String(formData.get("fide_rating") || "");
  payload.nzcf_rating = nzcfRating ? Number(nzcfRating) : null;
  payload.fide_rating = fideRating ? Number(fideRating) : null;
  const s = createSupabaseServiceClient();
  const { data: saved, error } = await s.from("club_memberships").update(payload).eq("id", id).select("*").single();
  if (error) throw new Error("Member update failed. Changes were not saved.");
  if (payload.membership_status === "active" && ["paid", "manual_paid", "waived"].includes(payload.payment_status)) await activateMembership(s, saved);
  revalidatePath("/club-admin/members");
}

async function deactivateMemberAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin("members");
  if (admin.profile.role !== "super_admin") throw new Error("Only Super Admin can deactivate members.");
  const id = String(formData.get("id") || "");
  const s = createSupabaseServiceClient();
  await s.from("club_memberships").update({ membership_status: "cancelled", updated_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/club-admin/members");
}

async function deleteMemberAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin("members");
  if (admin.profile.role !== "super_admin") throw new Error("Only Super Admin can delete members.");
  const id = String(formData.get("id") || "");
  const s = createSupabaseServiceClient();
  await s.from("club_memberships").delete().eq("id", id);
  revalidatePath("/club-admin/members");
}

export default async function MembersPage({ searchParams }: { searchParams: Promise<any> }) {
  const admin = await requireAdmin("members");
  const isSuperAdmin = admin.profile.role === "super_admin";
  const sp = await searchParams;
  const sort = sp.sort || "name";
  const keys = selectedColumnKeys(sp.columns, "members");
  const cols = selectedColumns("members", keys);
  const showPdfPreview = sp.pdf_preview === "1";

  const s = createSupabaseServiceClient();
  let q = s.from("club_memberships").select("*");
  q = applyMemberSearch(q, sp.search);
  if (sp.reference) q = q.ilike("membership_id", String(sp.reference).trim().replace(/[\\%_]/g, "\\$&"));
  if (sp.membership_status) q = q.eq("membership_status", sp.membership_status);
  if (sp.payment_status) q = q.eq("payment_status", sp.payment_status);
  if (sp.membership_type) q = q.contains("membership_options", [{ key: sp.membership_type }]);
  if (sort === "name") q = q.order("last_name").order("first_name");
  else if (sort === "nzcf_desc") q = q.order("nzcf_rating", { ascending: false, nullsFirst: false });
  else if (sort === "nzcf_asc") q = q.order("nzcf_rating", { ascending: true, nullsFirst: false });
  else if (sort === "fide_desc") q = q.order("fide_rating", { ascending: false, nullsFirst: false });
  else if (sort === "fide_asc") q = q.order("fide_rating", { ascending: true, nullsFirst: false });
  else q = q.order("created_at", { ascending: false });

  const { data, error: memberError } = await q;
  if (memberError) throw new Error("Member search failed. Please try again.");
  const rows = data || [];
  const totalAmount = rows.filter((m: any) => ["paid", "manual_paid"].includes(m.payment_status)).reduce((sum: number, m: any) => sum + Number(m.total_amount_cents || 0), 0);
  const paid = rows.filter((m: any) => ["paid", "manual_paid"].includes(m.payment_status)).length;
  const pending = rows.filter((m: any) => m.payment_status === "pending_payment").length;
  const base = formBase(sp);
  const pdfPreview = buildReportQuery(base, "members", keys, "pdf", true);
  const pdfDownload = buildReportQuery(base, "members", keys, "pdf");
  const csvDownload = buildReportQuery(base, "members", keys, "csv");
  const showPdfPreviewUrl = buildReportPageQuery(base, keys, true);
  const hidePdfPreviewUrl = buildReportPageQuery(base, keys, false);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4"><h1 className="text-3xl font-normal">Auckland Knights Membership Registration</h1><div className="flex gap-2"><a href="/join" className="btn-primary">Add New</a><a href={csvDownload} className="btn-secondary">Export</a><a href={showPdfPreviewUrl} className="btn-secondary">View PDF</a></div></div>
      <p className="mt-2 text-stone-600">Find a player by name, membership ID or registered email. Search results also filter the member records and exports below.</p>
      {isSuperAdmin && <p className="mt-2 rounded-lg bg-amber-50 p-3 text-sm font-semibold text-amber-900">Super Admin mode: you can edit, deactivate or remove members below. Deactivate is safer than delete because payment history may be needed later.</p>}

      <form className="mt-5 space-y-5 bg-stone-100 p-6">
        <div className="grid gap-6 md:grid-cols-[1fr_1fr_1fr_1fr_auto]">
          <label><span className="admin-label">Status</span><select name="membership_status" defaultValue={sp.membership_status || ""} className="admin-input"><option value="">ALL</option>{["active","pending_payment","expired","cancelled"].map(status=><option key={status} value={status}>{status}</option>)}</select></label>
          <label><span className="admin-label">Sort Order</span><select name="sort" defaultValue={sort} className="admin-input"><option value="name">Name</option><option value="created_at_desc">Newest first</option><option value="nzcf_desc">NZCF rating high to low</option><option value="nzcf_asc">NZCF rating low to high</option><option value="fide_desc">FIDE rating high to low</option><option value="fide_asc">FIDE rating low to high</option></select></label>
          <label><span className="admin-label">Name Search</span><input name="search" defaultValue={sp.search || ""} placeholder="Name or email" className="admin-input" /></label>
          <label><span className="admin-label">Reference Search</span><input name="reference" defaultValue={sp.reference || ""} placeholder="Membership ID" className="admin-input" /></label>
          <div className="flex items-end"><button className="btn-primary">Search</button></div>
        </div>
        <div className="flex flex-wrap items-center gap-3"><select name="payment_status" defaultValue={sp.payment_status || ""} className="admin-input max-w-xs"><option value="">All payment statuses</option>{["paid","manual_paid","waived","pending_payment","failed","expired","refunded"].map(status=><option key={status} value={status}>{status}</option>)}</select><a href="/club-admin/members" className="text-sm underline">Clear filters</a></div>
        <details><summary className="admin-label mb-2 cursor-pointer">Choose report columns</summary><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{REPORT_COLUMNS.members.map((c) => <label key={c.key} className="flex items-center gap-2 rounded-lg border border-stone-200 p-2 text-sm"><input type="checkbox" name="columns" value={c.key} defaultChecked={keys.includes(c.key)} />{c.label}</label>)}</div></details>
        <div className="flex flex-wrap gap-3"><a href={csvDownload} className="btn-secondary py-2">Download CSV</a><a href={pdfDownload} className="btn-secondary py-2">Download PDF</a>{showPdfPreview ? <a href={hidePdfPreviewUrl} className="btn-secondary py-2">Hide PDF Preview</a> : <a href={showPdfPreviewUrl} className="btn-secondary py-2">Show PDF Preview</a>}</div>
      </form>

      <section className="mt-6 grid gap-4 md:grid-cols-4"><div className="card p-4"><p className="text-xs font-bold uppercase text-stone-500">Total members</p><p className="mt-2 text-2xl font-extrabold">{rows.length}</p></div><div className="card p-4"><p className="text-xs font-bold uppercase text-stone-500">Paid</p><p className="mt-2 text-2xl font-extrabold text-green-700">{paid}</p></div><div className="card p-4"><p className="text-xs font-bold uppercase text-stone-500">Pending</p><p className="mt-2 text-2xl font-extrabold text-amber-700">{pending}</p></div><div className="card p-4"><p className="text-xs font-bold uppercase text-stone-500">Paid total</p><p className="mt-2 text-2xl font-extrabold">{formatMoney(totalAmount)}</p></div></section>

      <section className="card mt-6 overflow-hidden"><div className="border-b bg-white p-5"><h2 className="text-xl font-extrabold">Report Preview - Club Members</h2><p className="mt-1 text-sm text-stone-500">Paid and balance reflect the recorded full-payment status. Waived fees have no balance. Notes are unavailable until a notes field is configured.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[1200px] text-sm"><thead className="bg-stone-100 text-left"><tr>{cols.map((c) => <th key={c.key} className="p-3">{c.label}</th>)}<th className="p-3">Confirmation</th></tr></thead><tbody>{rows.length === 0 && <tr><td colSpan={cols.length + 1} className="p-5 text-stone-600">No members match this search. Try a name, membership ID or email, or clear the filters.</td></tr>}{rows.map((m: any) => <tr key={m.id} className="border-t">{cols.map((c) => <td key={c.key} className={`p-3 ${c.key === "balance" ? "text-red-600" : c.key === "registered" ? "text-orange-600" : ""}`}>{c.key === "name" ? <><span className="font-semibold text-green-700">{m.last_name}, {m.first_name}</span><br/><span className="text-stone-500">{m.membership_id || "Pending ID"}</span></> : c.value(m)}</td>)}<td className="p-3"><MemberPaymentCheck id={m.id} /></td></tr>)}</tbody></table></div></section>

      {isSuperAdmin && <section className="card mt-6 overflow-hidden"><div className="border-b bg-white p-5"><h2 className="text-xl font-extrabold">Super Admin Member Maintenance</h2><p className="mt-1 text-sm text-stone-500">Update member details, status, payment status, validity and ratings. Membership ID is locked and cannot be edited.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[1500px] text-sm"><thead className="bg-stone-100 text-left"><tr><th className="p-3">Name</th><th className="p-3">Contact</th><th className="p-3">Membership</th><th className="p-3">Validity</th><th className="p-3">Ratings</th><th className="p-3">Actions</th></tr></thead><tbody>{rows.map((m:any)=><tr key={m.id} className="border-t align-top"><td className="p-3"><form action={updateMemberAction} id={`member-${m.id}`} className="grid gap-2"><input type="hidden" name="id" value={m.id}/><input name="first_name" defaultValue={m.first_name||""} className="admin-input" placeholder="First name"/><input name="last_name" defaultValue={m.last_name||""} className="admin-input" placeholder="Last name"/></form></td><td className="p-3"><div className="grid gap-2"><input form={`member-${m.id}`} name="email" defaultValue={m.email||""} className="admin-input" placeholder="Email"/><input form={`member-${m.id}`} name="phone" defaultValue={m.phone||""} className="admin-input" placeholder="Phone"/></div></td><td className="p-3"><div className="grid gap-2"><div className="rounded-lg border border-stone-200 bg-stone-50 p-2"><p className="text-xs font-bold uppercase text-stone-500">Membership ID</p><p className="font-extrabold text-stone-900">{m.membership_id || "Not generated yet"}</p><p className="mt-1 text-xs text-stone-500">Read-only. Auto-generated by the system.</p></div><select form={`member-${m.id}`} name="membership_status" defaultValue={m.membership_status||"active"} className="admin-input"><option value="pending_payment">Pending Payment</option><option value="active">Active</option><option value="expired">Expired</option><option value="cancelled">Cancelled</option></select><select form={`member-${m.id}`} name="payment_status" defaultValue={m.payment_status||"paid"} className="admin-input"><option value="pending_payment">Pending Payment</option><option value="paid">Paid</option><option value="manual_paid">Manual / Bank Transfer Paid</option><option value="waived">Waived</option><option value="failed">Failed</option><option value="expired">Expired</option><option value="refunded">Refunded</option></select></div></td><td className="p-3"><div className="grid gap-2"><input form={`member-${m.id}`} name="membership_start_date" type="date" defaultValue={m.membership_start_date||""} className="admin-input"/><input form={`member-${m.id}`} name="membership_end_date" type="date" defaultValue={m.membership_end_date||""} className="admin-input"/></div></td><td className="p-3"><div className="grid gap-2"><input form={`member-${m.id}`} name="nzcf_id" defaultValue={m.nzcf_id||""} className="admin-input" placeholder="NZCF ID"/><input form={`member-${m.id}`} name="nzcf_rating" defaultValue={m.nzcf_rating||""} className="admin-input" placeholder="NZCF rating"/><input form={`member-${m.id}`} name="fide_id" defaultValue={m.fide_id||""} className="admin-input" placeholder="FIDE ID"/><input form={`member-${m.id}`} name="fide_rating" defaultValue={m.fide_rating||""} className="admin-input" placeholder="FIDE rating"/></div></td><td className="p-3"><div className="flex flex-col gap-2"><button form={`member-${m.id}`} className="btn-primary py-2">Update</button><form action={deactivateMemberAction}><input type="hidden" name="id" value={m.id}/><button className="btn-secondary w-full py-2">Deactivate</button></form><form action={deleteMemberAction}><input type="hidden" name="id" value={m.id}/><button className="rounded-md border border-red-700 px-4 py-2 text-sm font-bold text-red-700">Delete</button></form></div></td></tr>)}</tbody></table></div></section>}

      {showPdfPreview && <section className="card mt-6 overflow-hidden"><div className="border-b p-5"><h2 className="text-xl font-extrabold">Embedded PDF Preview</h2><p className="mt-1 text-sm text-stone-500">This PDF uses the same filters and selected columns above.</p></div><iframe src={pdfPreview} title="Members PDF preview" className="h-[650px] w-full bg-white" /></section>}
    </div>
  );
}
