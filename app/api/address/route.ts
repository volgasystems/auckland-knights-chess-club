import { NextRequest, NextResponse } from "next/server";
import { suggestNZPost, detailsNZPost } from "@/lib/nzpostAddress";

type NormalisedAddress = {
  display: string;
  street_address: string;
  suburb: string;
  city: string;
  postcode: string;
};

function first(...values: any[]) {
  return values.find((v) => typeof v === "string" && v.trim().length > 0)?.trim() || "";
}

function normaliseGeneric(item: any): NormalisedAddress {
  const address = item?.address || item || {};
  const display = first(
    item?.display,
    item?.label,
    item?.text,
    item?.address,
    item?.full_address,
    item?.formatted,
    item?.display_name,
    item?.a,
    item?.description
  );
  const street = first(
    item?.street_address,
    item?.line1,
    item?.street,
    item?.streetAddress,
    [address?.house_number, address?.road].filter(Boolean).join(" "),
    address?.street,
    display.split(",")[0]
  );
  const suburb = first(
    item?.suburb,
    item?.locality,
    item?.district,
    address?.suburb,
    address?.neighbourhood,
    address?.city_district,
    address?.hamlet
  );
  const city = first(item?.city, item?.town, address?.city, address?.town, address?.village, address?.county);
  const postcode = first(item?.postcode, item?.postal_code, item?.post_code, address?.postcode);
  return { display: display || [street, suburb, city, postcode].filter(Boolean).join(", "), street_address: street, suburb, city, postcode };
}

async function searchAddy(query: string) {
  const key = process.env.ADDY_API_KEY;
  const customUrl = process.env.ADDY_API_URL;
  if (!key && !customUrl) return null;

  // Addy supports NZ-specific address autocomplete. The endpoint can be overridden with ADDY_API_URL.
  const url = customUrl
    ? `${customUrl}${customUrl.includes("?") ? "&" : "?"}q=${encodeURIComponent(query)}&s=${encodeURIComponent(query)}&key=${encodeURIComponent(key || "")}&max=8`
    : `https://api.addy.co.nz/search?key=${encodeURIComponent(key || "")}&s=${encodeURIComponent(query)}&max=8`;

  const res = await fetch(url, { headers: { Accept: "application/json" }, next: { revalidate: 60 } });
  if (!res.ok) throw new Error(`Addy lookup failed: ${res.status}`);
  const json = await res.json();
  const items = Array.isArray(json) ? json : (json.addresses || json.results || json.suggestions || json.items || json.matches || []);
  return items.map(normaliseGeneric).filter((x: NormalisedAddress) => x.display).slice(0, 8);
}

async function searchNominatim(query: string) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=nz&limit=8&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { "Accept-Language": "en-NZ", "User-Agent": "AucklandKnightsChessClub/1.0" }, next: { revalidate: 60 } });
  if (!res.ok) throw new Error(`Nominatim lookup failed: ${res.status}`);
  const json = await res.json();
  return (Array.isArray(json) ? json : []).map(normaliseGeneric).filter((x: NormalisedAddress) => x.display).slice(0, 8);
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q")?.trim() || "";
  const provider = (process.env.ADDRESS_PROVIDER || (process.env.NZPOST_CLIENT_ID ? "nzpost" : "addy")).toLowerCase();
  if (provider === "nzpost") {
    const dpid = req.nextUrl.searchParams.get("dpid");
    if ((dpid !== null && !/^\d{1,20}$/.test(dpid)) || query.length > 200) return NextResponse.json({ error: "Invalid address search" }, { status: 400 });
    if (dpid === null && query.length < 3) return NextResponse.json({ results: [] });
    try {
      const payload = dpid !== null ? { address: await detailsNZPost(dpid) } : { results: await suggestNZPost(query) };
      return NextResponse.json({ ...payload, provider: "nzpost" }, { headers: { "Cache-Control": "no-store" } });
    } catch {
      return NextResponse.json({ results: [], error: "Address lookup is unavailable. Please type the address manually." }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
  }
  if (query.length < 3) return NextResponse.json({ results: [] });

  try {
    let results: NormalisedAddress[] | null = null;
    if (provider === "addy") {
      results = await searchAddy(query);
      if (!results || results.length === 0) results = await searchNominatim(query);
    } else {
      results = await searchNominatim(query);
    }
    return NextResponse.json({ results });
  } catch (error: any) {
    try {
      const results = await searchNominatim(query);
      return NextResponse.json({ results, warning: error?.message || "Fallback address search used" });
    } catch (fallback: any) {
      return NextResponse.json({ results: [], error: fallback?.message || "Address lookup failed" }, { status: 200 });
    }
  }
}
