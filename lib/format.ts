export function formatMoney(cents?: number | null) {
  const value = Number(cents || 0) / 100;
  return new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD" }).format(value);
}
export function formatDate(input?: string | null) {
  if (!input) return "";
  return new Date(input).toLocaleDateString("en-NZ", { day: "2-digit", month: "short", year: "numeric" });
}
export function formatDateTime(input?: string | null) {
  if (!input) return "";
  return new Date(input).toLocaleString("en-NZ", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
export function slugify(text: string) {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
export function initials(first?: string | null, last?: string | null) {
  return `${first?.[0] || ""}${last?.[0] || ""}`.toUpperCase();
}
