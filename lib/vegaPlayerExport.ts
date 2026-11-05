const columns = ["Name", "Fed", "Birth date", "G", "Title", "ID FIDE", "Rtg FIDE", "K FIDE", "ID Nat", "Rtg Nat", "K Nat", "Origin", "S", "Info"];

function cell(value: unknown) {
  const text = String(value ?? "").replace(/[\r\n]+/g, " ");
  return /[,"]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
}

/** Comma-separated player export in Vega's displayed column order. */
export function vegaPlayerCsv(rows: any[]) {
  const records = rows.map(r => [
    [r.last_name, r.first_name].filter(Boolean).join(", "),
    r.federation,
    /^\d{4}/.exec(String(r.date_of_birth || ""))?.[0] || "0000.00.00",
    r.gender === "Male" ? "M" : r.gender === "Female" ? "F" : "",
    r.fide_title,
    r.fide_id || 0,
    r.fide_rating || 0,
    r.fide_k_factor ?? 0,
    r.nzcf_id || 0,
    r.nzcf_rating || 0,
    r.nzcf_k_factor ?? 0,
    r.club_name || r.school_name,
    "",
    "",
  ]);
  return [columns, ...records].map(row => row.map(cell).join(",")).join("\n");
}
