export function validDateOfBirth(value: unknown, now = new Date()): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1) return false;
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day) return false;
  const parts = new Intl.DateTimeFormat("en-NZ", { timeZone: "Pacific/Auckland", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const part = (type: string) => parts.find(p => p.type === type)?.value;
  return value <= `${part("year")}-${part("month")}-${part("day")}`;
}
