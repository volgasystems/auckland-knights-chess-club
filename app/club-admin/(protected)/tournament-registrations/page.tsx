import PdfPreview from "@/components/admin/PdfPreview";
import PaymentDiagnostics from "@/components/admin/PaymentDiagnostics";
import RegistrationRowActions from "@/components/admin/RegistrationRowActions";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { formatMoney } from "@/lib/format";
import { REPORT_COLUMNS, selectedColumnKeys, selectedColumns, buildReportQuery, buildReportPageQuery } from "@/lib/reports";

function formBase(sp: any) {
  return { sort: sp.sort, payment_status: sp.payment_status, tournament_id: sp.tournament_id };
}

export default async function RegistrationsPage({ searchParams }: { searchParams: Promise<any> }) {
  await requireAdmin("tournament_registrations");
  const sp = await searchParams;
  const sort = sp.sort || "created_at_desc";
  const keys = selectedColumnKeys(sp.columns, "tournament_registrations");
  const cols = selectedColumns("tournament_registrations", keys);
  const showPdfPreview = sp.pdf_preview === "1";

  const s = createSupabaseServiceClient();
  let q = s.from("tournament_registrations").select("*, tournaments(title)");
  if (sp.tournament_id) q = q.eq("tournament_id", sp.tournament_id);
  if (sp.payment_status) q = q.eq("payment_status", sp.payment_status);
  if (sort === "nzcf_desc") q = q.order("nzcf_rating", { ascending: false, nullsFirst: false });
  else if (sort === "fide_desc") q = q.order("fide_rating", { ascending: false, nullsFirst: false });
  else q = q.order("created_at", { ascending: false });

  const { data } = await q;
  const rows = data || [];
  const { data: tournaments } = await s.from("tournaments").select("id,title").order("title");
  const paid = rows.filter((r: any) => r.payment_status === "paid" && r.registration_status === "confirmed").length;
  const pending = rows.filter((r: any) => r.payment_status === "pending_payment").length;
  const totalAmount = rows.filter((r: any) => r.payment_status === "paid").reduce((sum: number, r: any) => sum + Number(r.entry_fee_cents || r.category_fee_cents || 0), 0);
  const base = formBase(sp);
  const pdfPreview = buildReportQuery(base, "tournament_registrations", keys, "pdf", true);
  const pdfDownload = buildReportQuery(base, "tournament_registrations", keys, "pdf");
  const csvDownload = buildReportQuery(base, "tournament_registrations", keys, "csv");
  const showPdfPreviewUrl = buildReportPageQuery(base, keys, true);
  const hidePdfPreviewUrl = buildReportPageQuery(base, keys, false);

  return (
    <div>
      <h1 className="text-3xl font-extrabold">Tournament Registrations</h1>
      <p className="mt-2 text-stone-600">Choose filters and columns before exporting. Public entries show only paid and confirmed players.</p>

      <PaymentDiagnostics />
      <form className="card mt-5 space-y-5 p-5">
        <div className="grid gap-3 md:grid-cols-4">
          <select name="tournament_id" defaultValue={sp.tournament_id || ""} className="admin-input"><option value="">All tournaments</option>{(tournaments || []).map((t: any) => <option key={t.id} value={t.id}>{t.title}</option>)}</select>
          <select name="payment_status" defaultValue={sp.payment_status || ""} className="admin-input"><option value="">All payment statuses</option><option value="paid">Paid</option><option value="pending_payment">Pending</option><option value="failed">Failed</option></select>
          <select name="sort" defaultValue={sort} className="admin-input"><option value="created_at_desc">Newest</option><option value="nzcf_desc">NZCF high-low</option><option value="fide_desc">FIDE high-low</option></select>
          <button className="btn-primary py-2">Preview Report</button>
        </div>

        <div><p className="admin-label mb-2">Choose report columns</p><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{REPORT_COLUMNS.tournament_registrations.map((c) => <label key={c.key} className="flex items-center gap-2 rounded-lg border border-stone-200 p-2 text-sm">{["tournament", "phone"].includes(c.key) && <input type="hidden" name="columns" value={c.key}/>}<input type="checkbox" name="columns" value={c.key} defaultChecked={keys.includes(c.key)} disabled={["tournament", "phone"].includes(c.key)} />{c.label}</label>)}</div></div>

        <div className="flex flex-wrap gap-3">
          <a href={csvDownload} className="btn-secondary py-2">Download CSV</a>
          <a href={pdfDownload} className="btn-secondary py-2">Download PDF</a>
          <PdfPreview src={pdfPreview} />
        </div>
      </form>

      <section className="mt-6 grid gap-4 md:grid-cols-4"><div className="card p-4"><p className="text-xs font-bold uppercase text-stone-500">Total entries</p><p className="mt-2 text-2xl font-extrabold">{rows.length}</p></div><div className="card p-4"><p className="text-xs font-bold uppercase text-stone-500">Confirmed paid</p><p className="mt-2 text-2xl font-extrabold text-green-700">{paid}</p></div><div className="card p-4"><p className="text-xs font-bold uppercase text-stone-500">Pending payment</p><p className="mt-2 text-2xl font-extrabold text-amber-700">{pending}</p></div><div className="card p-4"><p className="text-xs font-bold uppercase text-stone-500">Payments received</p><p className="mt-2 text-2xl font-extrabold">{formatMoney(totalAmount)}</p></div></section>

      <section className="card mt-6 overflow-hidden"><div className="border-b bg-white p-5"><h2 className="text-xl font-extrabold">Report Preview - Tournament Registrations</h2><p className="mt-1 text-sm text-stone-500">Payment shows Paid or Unpaid. Waived fees count as Paid.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[1250px] table-fixed text-sm"><thead className="bg-stone-100 text-left"><tr>{cols.map((c) => <th key={c.key} className="p-3">{c.label}</th>)}<th className="w-[160px] p-3">Actions</th></tr></thead><tbody>{rows.length === 0 && <tr><td colSpan={cols.length + 1} className="p-5 text-stone-600">No tournament registrations match these filters.</td></tr>}{rows.map((r: any) => <tr key={r.id} className="border-t">{cols.map((c) => <td key={c.key} className={`p-3 break-words align-top ${c.key === "balance" ? "text-red-600" : c.key === "registered" ? "text-orange-600" : ""}`}>{c.key === "player" ? <><span className="font-semibold text-green-700">{r.last_name}, {r.first_name}</span><br/><span className="text-stone-500">{r.membership_id || "Non-member"}</span></> : c.value(r)}</td>)}<td className="p-3"><RegistrationRowActions id={r.id} email={r.email} /></td></tr>)}</tbody></table></div></section>


    </div>
  );
}
