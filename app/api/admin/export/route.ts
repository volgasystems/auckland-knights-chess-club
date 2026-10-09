import { applyMemberSearch } from "@/lib/memberSearch";
import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { canAccess } from "@/lib/roles";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { toCsv } from "@/lib/csv";
import { selectedColumnKeys, rowsForColumns, type ReportType } from "@/lib/reports";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type FilterParams = URLSearchParams;

async function getRows(type: ReportType, role: string, params: FilterParams) {
  const s = createSupabaseServiceClient();

  if (type === "members") {
    if (!canAccess(role, "members")) throw new Error("Permission denied");
    let q = s.from("club_memberships").select("*");
    q = applyMemberSearch(q, params.get("search"));
    const memberStatus = params.get("membership_status");
    if (memberStatus) q = q.eq("membership_status", memberStatus);
    const paymentStatus = params.get("payment_status");
    const membershipType = params.get("membership_type");
    const sort = params.get("sort") || "created_at_desc";
    if (paymentStatus) q = q.eq("payment_status", paymentStatus);
    if (membershipType) q = q.contains("membership_options", [{ key: membershipType }]);
    if (sort === "name") q = q.order("last_name").order("first_name");
    else if (sort === "nzcf_desc") q = q.order("nzcf_rating", { ascending: false, nullsFirst: false });
    else if (sort === "nzcf_asc") q = q.order("nzcf_rating", { ascending: true, nullsFirst: false });
    else if (sort === "fide_desc") q = q.order("fide_rating", { ascending: false, nullsFirst: false });
    else if (sort === "fide_asc") q = q.order("fide_rating", { ascending: true, nullsFirst: false });
    else q = q.order("created_at", { ascending: false });
    return (await q).data || [];
  }

  if (type === "tournament_registrations") {
    if (!canAccess(role, "tournament_registrations")) throw new Error("Permission denied");
    let q = s.from("tournament_registrations").select("*, tournaments(title)");
    const tournamentId = params.get("tournament_id");
    const paymentStatus = params.get("payment_status");
    const sort = params.get("sort") || "created_at_desc";
    if (tournamentId) q = q.eq("tournament_id", tournamentId);
    if (paymentStatus) q = q.eq("payment_status", paymentStatus);
    if (sort === "nzcf_desc") q = q.order("nzcf_rating", { ascending: false, nullsFirst: false });
    else if (sort === "fide_desc") q = q.order("fide_rating", { ascending: false, nullsFirst: false });
    else q = q.order("created_at", { ascending: false });
    const rows = (await q).data || [];
    return rows.map((r: any) => ({ ...r, tournament_title: r.tournaments?.title }));
  }

  if (type === "absences") {
    if (!canAccess(role, "absences")) throw new Error("Permission denied");
    let q = s.from("absences").select("*").order("created_at", { ascending: false });
    const tournamentName = params.get("tournament_name");
    const roundNumber = params.get("round_number");
    const status = params.get("status");
    if (tournamentName) q = q.ilike("tournament_name", `%${tournamentName}%`);
    if (roundNumber) q = q.eq("round_number", roundNumber);
    if (status) q = q.eq("status", status);
    return (await q).data || [];
  }

  if (type === "payments") {
    if (!canAccess(role, "payments")) throw new Error("Permission denied");
    return (await s.from("payment_records").select("*").order("created_at", { ascending: false })).data || [];
  }

  throw new Error("Unknown report type");
}

function safeFileName(value: string) { return value.replace(/[^a-z0-9_-]/gi, "_").toLowerCase(); }
function safeText(value: unknown) {
  if (value === null || value === undefined) return "";
  const text = typeof value === "object" ? JSON.stringify(value) : String(value);
  return text.replace(/[\r\n\t]+/g, " ").replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/[\u2013\u2014]/g, "-").replace(/[^\x20-\x7E]/g, "?").trim();
}
function pdfEscape(text: string) { return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)"); }
function wrapLine(line: string, max = 98) {
  const words = line.split(/\s+/).filter(Boolean); const lines: string[] = []; let current = "";
  for (const word of words) { if (!current) current = word; else if ((current + " " + word).length <= max) current += " " + word; else { lines.push(current); current = word; } }
  if (current) lines.push(current); return lines.length ? lines : [""];
}
function reportTitle(type: ReportType) {
  if (type === "members") return "Club Members";
  if (type === "tournament_registrations") return "Tournament Registrations";
  if (type === "absences") return "Absences";
  if (type === "payments") return "Payments";
  return type;
}
function buildPdfLines(title: string, rows: Record<string, any>[]) {
  const lines: string[] = [];
  lines.push("Auckland Knights Chess Club");
  lines.push(`${title} Report`);
  lines.push(`Generated: ${new Date().toLocaleString("en-NZ")}`);
  lines.push(`Total records: ${rows.length}`);
  lines.push("");
  if (rows.length === 0) { lines.push("No records found for this report."); return lines; }
  const headers = Object.keys(rows[0] || {});
  lines.push(headers.join(" | "));
  lines.push("-".repeat(Math.min(110, headers.join(" | ").length)));
  rows.slice(0, 220).forEach((row) => {
    const line = headers.map((h) => safeText(row[h])).join(" | ");
    lines.push(...wrapLine(line, 120));
  });
  if (rows.length > 220) lines.push("Only the first 220 records are shown in this PDF. Use CSV for full export.");
  return lines;
}
function makePdf(title: string, rows: Record<string, any>[]) {
  const allLines = buildPdfLines(title, rows);
  const linesPerPage = 42; const pages: string[][] = [];
  for (let i = 0; i < allLines.length; i += linesPerPage) pages.push(allLines.slice(i, i + linesPerPage));
  if (!pages.length) pages.push(["No records found."]);
  const objects: string[] = []; const addObject = (body: string) => { objects.push(body); return objects.length; };
  const catalogId = addObject("<< /Type /Catalog /Pages 2 0 R >>");
  const pagesId = addObject("__PAGES__");
  const fontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const pageIds: number[] = [];
  for (const pageLines of pages) {
    const contentLines = ["BT","/F1 8 Tf","10 TL","28 560 Td",...pageLines.map((line) => `(${pdfEscape(safeText(line))}) Tj T*`),"ET"];
    const content = contentLines.join("\n");
    const contentId = addObject(`<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`);
    const pageId = addObject(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`);
    pageIds.push(pageId);
  }
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;
  let pdf = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n"; const offsets = [0];
  for (let i = 0; i < objects.length; i++) { offsets.push(Buffer.byteLength(pdf, "latin1")); pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`; }
  const xrefOffset = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i++) pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "latin1");
}

export async function GET(req: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Not authorised" }, { status: 401 });
  const url = new URL(req.url);
  const type = (url.searchParams.get("type") || "members") as ReportType;
  const format = url.searchParams.get("format") || "csv";
  const preview = url.searchParams.get("preview") === "1";
  try {
    const rows = await getRows(type, admin.profile.role, url.searchParams);
    const keys = selectedColumnKeys(url.searchParams.get("columns"), type);
    const shaped = rowsForColumns(rows as any[], type, keys);
    const filename = safeFileName(type);
    if (format === "pdf") {
      const pdf = makePdf(reportTitle(type), shaped as Record<string, any>[]);
      return new NextResponse(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `${preview ? "inline" : "attachment"}; filename="${filename}.pdf"`, "Cache-Control": "no-store" } });
    }
    const csv = toCsv(shaped as Record<string, any>[]);
    return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}.csv"`, "Cache-Control": "no-store" } });
  } catch (e: any) {
    const status = e.message === "Permission denied" ? 403 : 400;
    return NextResponse.json({ error: e.message }, { status });
  }
}
