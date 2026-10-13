import { unstable_cache } from "next/cache";

export function fideProfileUrl(value: unknown): string | null {
  const id = String(value ?? "").trim();
  return /^[1-9]\d{0,11}$/.test(id) ? `https://ratings.fide.com/profile/${id}` : null;
}
export function clubAbbreviation(value: unknown): string {
  const name = String(value ?? "").trim();
  if (!name) return "";
  const words = name.match(/[A-Za-z0-9]+/g) || [];
  const normalized = words.join(" ").toLowerCase();
  if (/^auckland knights(?: chess club)?$/.test(normalized)) return "AKCC";
  if (/^howick pakuranga(?: chess club)?$/.test(normalized)) return "HPCC";
  if (words.length === 1) return name.replace(/[^a-z0-9]/gi, "").slice(0, 4).toUpperCase();
  return words.filter(w => !["the", "of", "and"].includes(w.toLowerCase())).map(w => w[0]).join("").slice(0, 4).toUpperCase();
}
export function publicGender(value: unknown): string {
  const gender = String(value ?? "").trim().toLowerCase();
  if (["male", "m"].includes(gender)) return "M";
  if (["female", "f"].includes(gender)) return "F";
  if (gender === "non-binary") return "NB";
  if (gender === "other") return "Other";
  return "";
}
export function parseFideTitle(html: string): string {
  // Use the over-the-board FIDE title field, never the separate FOA arena title.
  const raw = html.match(/<h5[^>]*>\s*FIDE title\s*<\/h5>\s*<div[^>]*>\s*<p[^>]*>([^<]*)<\/p>/i)?.[1]?.trim();
  const titles: Record<string, string> = { "Grandmaster": "GM", "International Master": "IM", "FIDE Master": "FM", "Candidate Master": "CM", "Woman Grandmaster": "WGM", "Woman International Master": "WIM", "Woman FIDE Master": "WFM", "Woman Candidate Master": "WCM" };
  if (!raw) return "";
  return titles[raw] || (/^(GM|IM|FM|CM|WGM|WIM|WFM|WCM)$/.test(raw) ? raw : "");
}
export const playerFideTitle = unstable_cache(async (id: string): Promise<string> => {
  const url = fideProfileUrl(id);
  if (!url) return "";
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!response.ok) return "";
    return parseFideTitle(await response.text());
  } catch { return ""; }
}, ["public-fide-title-v1"], { revalidate: 86400 });
