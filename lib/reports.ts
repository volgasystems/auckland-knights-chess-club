export type ReportType = "members" | "tournament_registrations" | "absences" | "payments";

export type ReportColumn = {
  key: string;
  label: string;
  value: (row: any) => any;
};

export const REPORT_COLUMNS: Record<ReportType, ReportColumn[]> = {
  members: [
    { key: "name", label: "Name", value: (m) => `${m.first_name || ""} ${m.last_name || ""}`.trim() },
    { key: "payable", label: "Payable", value: (m) => `$${(Number(m.total_amount_cents || 0)/100).toFixed(2)}` },
    { key: "paid", label: "Paid", value: (m) => `$${(["paid", "manual_paid"].includes(m.payment_status) ? Number(m.total_amount_cents || 0)/100 : 0).toFixed(2)}` },
    { key: "balance", label: "Balance", value: (m) => `$${(["paid", "manual_paid", "waived"].includes(m.payment_status) ? 0 : Number(m.total_amount_cents || 0)/100).toFixed(2)}` },
    { key: "notes", label: "Notes", value: (m) => m.notes || "" },
    { key: "person_id", label: "Person ID", value: (m) => m.id },
    { key: "email", label: "Email", value: (m) => m.email },
    { key: "phone", label: "Phone", value: (m) => m.phone },
    { key: "membership_id", label: "Membership ID", value: (m) => m.membership_id },
    { key: "membership_status", label: "Status", value: (m) => m.membership_status },
    { key: "membership_end_date", label: "Expiry Date", value: (m) => m.membership_end_date },
    { key: "school", label: "School", value: (m) => m.school },
    { key: "parent_guardian", label: "Parent/Guardian", value: (m) => [m.parent_guardian_first_name, m.parent_guardian_last_name].filter(Boolean).join(" ") || m.parent_guardian_name },
    { key: "nzcf_id", label: "NZCF ID", value: (m) => m.nzcf_id },
    { key: "nzcf_rating", label: "NZCF Rating", value: (m) => m.nzcf_rating },
    { key: "fide_id", label: "FIDE ID", value: (m) => m.fide_id },
    { key: "fide_rating", label: "FIDE Rating", value: (m) => m.fide_rating },
    { key: "payment_status", label: "Payment", value: (m) => m.payment_status },
    { key: "amount", label: "Amount", value: (m) => m.total_amount_cents != null ? `$${(Number(m.total_amount_cents)/100).toFixed(2)}` : "" },
    { key: "registered", label: "Date Registered", value: (m) => m.created_at ? new Date(m.created_at).toLocaleString("en-NZ", { timeZone: "Pacific/Auckland" }) : "" }
  ],
  tournament_registrations: [
    { key: "tournament", label: "Tournament", value: (r) => r.tournament_title || r.tournaments?.title },
    { key: "category", label: "Category", value: (r) => r.category_name || (r.is_member_registration ? "Membership Event" : "General") },
    { key: "membership_id", label: "Membership ID", value: (r) => r.membership_id },
    { key: "player", label: "Player", value: (r) => `${r.first_name || ""} ${r.last_name || ""}`.trim() },
    { key: "email", label: "Email", value: (r) => r.email },
    { key: "phone", label: "Phone", value: (r) => r.phone },
    { key: "club_school", label: "Club/School", value: (r) => r.club_name || r.school_name },
    { key: "nzcf_id", label: "NZCF ID", value: (r) => r.nzcf_id },
    { key: "nzcf_rating", label: "NZCF Rating", value: (r) => r.nzcf_rating },
    { key: "fide_id", label: "FIDE ID", value: (r) => r.fide_id },
    { key: "fide_rating", label: "FIDE Rating", value: (r) => r.fide_rating },
    { key: "payment_status", label: "Payment", value: (r) => r.payment_status },
    { key: "registration_status", label: "Status", value: (r) => r.registration_status },
    { key: "fee", label: "Fee", value: (r) => `$${(Number(r.entry_fee_cents || r.category_fee_cents || 0)/100).toFixed(2)}` },
    { key: "registered", label: "Registered", value: (r) => r.created_at ? new Date(r.created_at).toLocaleDateString("en-NZ") : "" }
  ],
  absences: [
    { key: "player", label: "Player", value: (a) => `${a.player_first_name || ""} ${a.player_last_name || ""}`.trim() },
    { key: "tournament", label: "Tournament", value: (a) => a.tournament_name },
    { key: "round", label: "Round", value: (a) => a.round_number },
    { key: "round_date", label: "Round Date", value: (a) => a.round_date },
    { key: "reason", label: "Reason", value: (a) => a.reason },
    { key: "email", label: "Email", value: (a) => a.email },
    { key: "phone", label: "Phone", value: (a) => a.phone },
    { key: "status", label: "Status", value: (a) => a.status },
    { key: "submitted", label: "Submitted", value: (a) => a.created_at ? new Date(a.created_at).toLocaleString("en-NZ") : "" }
  ],
  payments: [
    { key: "type", label: "Type", value: (p) => p.payment_type },
    { key: "name", label: "Name", value: (p) => p.customer_name },
    { key: "email", label: "Email", value: (p) => p.customer_email },
    { key: "amount", label: "Amount", value: (p) => p.amount_cents != null ? `$${(Number(p.amount_cents)/100).toFixed(2)}` : "" },
    { key: "status", label: "Status", value: (p) => p.payment_status },
    { key: "date", label: "Date", value: (p) => p.created_at ? new Date(p.created_at).toLocaleDateString("en-NZ") : "" }
  ]
};

export const DEFAULT_COLUMNS: Record<ReportType, string[]> = {
  members: ["name", "registered", "payable", "paid", "balance", "notes", "person_id", "membership_status", "email"],
  tournament_registrations: ["tournament", "category", "membership_id", "player", "email", "phone", "nzcf_rating", "fide_rating", "payment_status", "registration_status", "fee"],
  absences: ["player", "tournament", "round", "round_date", "reason", "email", "phone", "status"],
  payments: ["type", "name", "email", "amount", "status", "date"]
};

export function selectedColumnKeys(input: any, type: ReportType): string[] {
  if (!input) return DEFAULT_COLUMNS[type];
  const raw = Array.isArray(input) ? input.join(",") : String(input);
  const valid = new Set(REPORT_COLUMNS[type].map((c) => c.key));
  const keys = raw.split(",").map((v) => v.trim()).filter((v) => valid.has(v));
  return keys.length ? keys : DEFAULT_COLUMNS[type];
}

export function selectedColumns(type: ReportType, keys: string[]) {
  return keys.map(key => REPORT_COLUMNS[type].find(c => c.key === key)).filter((c): c is ReportColumn => !!c);
}

export function rowsForColumns(rows: any[], type: ReportType, keys: string[]) {
  const cols = selectedColumns(type, keys);
  return rows.map((row) => Object.fromEntries(cols.map((col) => [col.label, col.value(row) ?? ""])));
}

export function buildReportQuery(base: Record<string, any>, type: ReportType, keys: string[], format: "csv" | "pdf", preview = false) {
  const params = new URLSearchParams();
  params.set("type", type);
  params.set("format", format);
  params.set("columns", keys.join(","));
  if (preview) params.set("preview", "1");
  for (const [key, value] of Object.entries(base)) {
    if (value !== undefined && value !== null && value !== "" && key !== "columns") params.set(key, String(value));
  }
  return `/api/admin/export?${params.toString()}`;
}


export function buildReportPageQuery(base: Record<string, any>, keys: string[], showPdfPreview: boolean) {
  const params = new URLSearchParams();
  params.set("columns", keys.join(","));
  if (showPdfPreview) params.set("pdf_preview", "1");
  for (const [key, value] of Object.entries(base)) {
    if (value !== undefined && value !== null && value !== "" && key !== "columns") params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `?${query}` : "?";
}
