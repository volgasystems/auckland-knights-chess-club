import { requireAdmin } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { REPORT_COLUMNS, selectedColumnKeys, selectedColumns, buildReportQuery, buildReportPageQuery } from "@/lib/reports";

function formBase(sp: any) {
  return {
    tournament_name: sp.tournament_name,
    round_number: sp.round_number,
    status: sp.status,
  };
}

export default async function AbsencesPage({ searchParams }: { searchParams: Promise<any> }) {
  await requireAdmin("absences");
  const sp = await searchParams;
  const keys = selectedColumnKeys(sp.columns, "absences");
  const cols = selectedColumns("absences", keys);
  const showPdfPreview = sp.pdf_preview === "1";

  const s = createSupabaseServiceClient();
  let q = s.from("absences").select("*").order("created_at", { ascending: false });
  if (sp.tournament_name) q = q.ilike("tournament_name", `%${sp.tournament_name}%`);
  if (sp.round_number) q = q.eq("round_number", sp.round_number);
  if (sp.status) q = q.eq("status", sp.status);

  const { data } = await q;
  const rows = data || [];
  const reviewed = rows.filter((a: any) => a.status === "reviewed" || a.status === "noted").length;
  const base = formBase(sp);
  const pdfPreview = buildReportQuery(base, "absences", keys, "pdf", true);
  const pdfDownload = buildReportQuery(base, "absences", keys, "pdf");
  const csvDownload = buildReportQuery(base, "absences", keys, "csv");
  const showPdfPreviewUrl = buildReportPageQuery(base, keys, true);
  const hidePdfPreviewUrl = buildReportPageQuery(base, keys, false);

  return (
    <div>
      <h1 className="text-3xl font-extrabold">Absence Reports</h1>
      <p className="mt-2 text-stone-600">Choose filters and columns, preview the absence report on screen, then export CSV or PDF.</p>

      <form className="card mt-5 space-y-5 p-5">
        <div className="grid gap-3 md:grid-cols-4">
          <input name="tournament_name" placeholder="Tournament" defaultValue={sp.tournament_name || ""} className="admin-input" />
          <input name="round_number" placeholder="Round" defaultValue={sp.round_number || ""} className="admin-input" />
          <select name="status" defaultValue={sp.status || ""} className="admin-input">
            <option value="">All statuses</option>
            <option value="new">New</option>
            <option value="reviewed">Reviewed</option>
            <option value="noted">Noted</option>
          </select>
          <button className="btn-primary py-2">Preview Report</button>
        </div>

        <div>
          <p className="admin-label mb-2">Choose report columns</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {REPORT_COLUMNS.absences.map((c) => (
              <label key={c.key} className="flex items-center gap-2 rounded-lg border border-stone-200 p-2 text-sm">
                <input type="checkbox" name="columns" value={c.key} defaultChecked={keys.includes(c.key)} />
                {c.label}
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <a href={csvDownload} className="btn-secondary py-2">Download CSV</a>
          <a href={pdfDownload} className="btn-secondary py-2">Download PDF</a>
          {showPdfPreview ? (
            <a href={hidePdfPreviewUrl} className="btn-secondary py-2">Hide PDF Preview</a>
          ) : (
            <a href={showPdfPreviewUrl} className="btn-secondary py-2">Show PDF Preview</a>
          )}
        </div>
      </form>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="card p-4"><p className="text-xs font-bold uppercase text-stone-500">Total absences</p><p className="mt-2 text-2xl font-extrabold">{rows.length}</p></div>
        <div className="card p-4"><p className="text-xs font-bold uppercase text-stone-500">New</p><p className="mt-2 text-2xl font-extrabold text-amber-700">{rows.length - reviewed}</p></div>
        <div className="card p-4"><p className="text-xs font-bold uppercase text-stone-500">Reviewed/noted</p><p className="mt-2 text-2xl font-extrabold text-green-700">{reviewed}</p></div>
      </section>

      <section className="card mt-6 overflow-hidden">
        <div className="border-b bg-white p-5">
          <h2 className="text-xl font-extrabold">Report Preview - Absences</h2>
          <p className="mt-1 text-sm text-stone-500">Generated {new Date().toLocaleString("en-NZ")}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone-100 text-left"><tr>{cols.map((c) => <th key={c.key} className="p-3">{c.label}</th>)}</tr></thead>
            <tbody>
              {rows.map((a: any) => (
                <tr key={a.id} className="border-t">{cols.map((c) => <td key={c.key} className="p-3">{c.value(a)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {showPdfPreview && (
        <section className="card mt-6 overflow-hidden">
          <div className="border-b p-5">
            <h2 className="text-xl font-extrabold">Embedded PDF Preview</h2>
            <p className="mt-1 text-sm text-stone-500">This PDF uses the same filters and selected columns above.</p>
          </div>
          <iframe src={pdfPreview} title="Absences PDF preview" className="h-[650px] w-full bg-white" />
        </section>
      )}
    </div>
  );
}
