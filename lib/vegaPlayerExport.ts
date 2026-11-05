/** Private arbiter CSV for field mapping, not a native Vega tournament file. */
export function vegaPlayerRows(rows: any[]) {
  return rows.map(r => ({
    Name: [r.last_name, r.first_name].filter(Boolean).join(", "),
    Title: r.fide_title || "",
    Gender: r.gender === "Male" ? "M" : r.gender === "Female" ? "F" : "",
    DOB: String(r.date_of_birth || "").slice(0, 10),
    Federation: r.federation || "",
    "FIDE ID": r.fide_id ?? "",
    "FIDE Rating": r.fide_rating ?? "",
    "NZCF ID": r.nzcf_id ?? "",
    "NZCF Rating": r.nzcf_rating ?? "",
    Club: r.club_name || r.school_name || "",
  }));
}
