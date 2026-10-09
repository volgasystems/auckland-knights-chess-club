export function applyMemberSearch(query: any, value: unknown) {
  const search = String(value || "").trim().slice(0, 254);
  if (!search) return query;
  // Exact, case-insensitive matching; user input cannot become a wildcard filter.
  const literal = search.replace(/[\\%_]/g, "\\$&");
  return query.ilike(search.includes("@") ? "email" : "membership_id", literal);
}
