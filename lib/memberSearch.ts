// Quote PostgREST filter values and keep user input literal, including wildcard characters.
function filterValue(value: string) {
  const literal = value.replace(/[\\%_]/g, "\\$&");
  return `"${literal.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}
export function applyMemberSearch(query: any, value: unknown) {
  const search = String(value || "").trim().slice(0, 254);
  if (!search) return query;
  if (search.includes("@")) return query.ilike("email", search.replace(/[\\%_]/g, "\\$&"));
  const names = search.split(/\s+/).slice(0, 8).map(token => {
    const pattern = filterValue(token);
    const contains = `"%${pattern.slice(1, -1)}%"`;
    return `or(first_name.ilike.${contains},last_name.ilike.${contains})`;
  });
  const nameMatch = names.length === 1 ? names[0] : `and(${names.join(",")})`;
  return query.or(`membership_id.ilike.${filterValue(search)},${nameMatch}`);
}
