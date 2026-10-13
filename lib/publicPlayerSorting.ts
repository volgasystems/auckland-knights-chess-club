export const PLAYER_SORT_OPTIONS = [
  { value: "registered", label: "Registration order" },
  { value: "name", label: "Name A–Z" },
  { value: "fide", label: "FIDE rating ↓" },
  { value: "nzcf", label: "NZCF rating ↓" }
] as const;
export type PlayerSort = typeof PLAYER_SORT_OPTIONS[number]["value"];
export function playerSort(value: unknown): PlayerSort {
  return PLAYER_SORT_OPTIONS.some(option => option.value === value) ? value as PlayerSort : "registered";
}
export function sortPublicPlayers<T extends { first_name?: string; last_name?: string; fide_rating?: unknown; nzcf_rating?: unknown }>(players: T[], value: unknown): T[] {
  const sort = playerSort(value);
  const rows = [...players];
  if (sort === "registered") return rows;
  const name = (p: T) => [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
  const compareName = (a: T, b: T) => name(a).localeCompare(name(b), "en-NZ", { sensitivity: "base", numeric: true });
  const rating = (n: unknown) => Number.isFinite(Number(n)) && Number(n) > 0 ? Number(n) : 0;
  return rows.sort((a, b) => sort === "name" ? compareName(a, b) : rating(b[sort === "fide" ? "fide_rating" : "nzcf_rating"]) - rating(a[sort === "fide" ? "fide_rating" : "nzcf_rating"]) || compareName(a, b));
}
