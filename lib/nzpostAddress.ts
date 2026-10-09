// Server-only NZ Post AddressChecker integration. Never expose credentials to clients.
export type NZPostAddress = { display: string; street_address: string; suburb: string; city: string; postcode: string; dpid?: string; provider: "nzpost" };
let cached: { token: string; expires: number; clientId: string } | undefined;
let pending: Promise<string> | undefined;
async function token(): Promise<string> {
  const clientId = process.env.NZPOST_CLIENT_ID;
  const secret = process.env.NZPOST_CLIENT_SECRET;
  if (!clientId || !secret) throw new Error("NZ Post credentials missing");
  if (cached?.clientId === clientId && cached.expires > Date.now()) return cached.token;
  if (pending) return pending;
  pending = (async () => {
    const res = await fetch("https://oauth.nzpost.co.nz/as/token.oauth2", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "client_credentials", client_id: clientId, client_secret: secret }), cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error("NZ Post authentication failed");
    const data = await res.json();
    if (typeof data.access_token !== "string" || !data.access_token) throw new Error("Invalid NZ Post authentication response");
    cached = { token: data.access_token, clientId, expires: Date.now() + Math.max(0, Number(data.expires_in || 0) - 60) * 1000 };
    return cached.token;
  })();
  try { return await pending; } finally { pending = undefined; }
}
async function request(path: string, params: Record<string, string>, retry = true): Promise<any> {
  const accessToken = await token();
  const res = await fetch(`https://api.nzpost.co.nz/addresschecker/1.0/${path}?${new URLSearchParams(params)}`, { headers: { Accept: "application/json", Authorization: `Bearer ${accessToken}` }, cache: "no-store", signal: AbortSignal.timeout(8000) });
  if (res.status === 401 && retry) { cached = undefined; return request(path, params, false); }
  if (!res.ok) throw new Error("NZ Post address lookup failed");
  const data = await res.json();
  if (data.success !== true) throw new Error("NZ Post address lookup unsuccessful");
  return data;
}
export async function suggestNZPost(query: string): Promise<NZPostAddress[]> {
  const data = await request("suggest", { q: query, max: "8" });
  if (!Array.isArray(data.addresses)) throw new Error("Invalid NZ Post suggestions");
  return data.addresses.filter((a: any) => typeof a.FullAddress === "string" && /^\d+$/.test(String(a.DPID))).slice(0, 8).map((a: any) => ({ display: a.FullAddress, dpid: String(a.DPID), street_address: "", suburb: "", city: "", postcode: "", provider: "nzpost" }));
}
export async function detailsNZPost(dpid: string): Promise<NZPostAddress> {
  if (!/^\d{1,20}$/.test(dpid)) throw new Error("Invalid address identifier");
  const data = await request("details", { dpid });
  const a = Array.isArray(data.details) ? data.details[0] : data.details;
  if (!a || !a.AddressLine1 || String(a.DPID) !== dpid) throw new Error("Invalid NZ Post address details");
  const value = (v: unknown) => v == null ? "" : String(v).trim();
  const lines = [1, 2, 3, 4, 5].map(n => value(a[`AddressLine${n}`])).filter(Boolean);
  // Preserve unit, floor, PO Box and rural delivery formatting supplied by NZ Post.
  const postcode = value(a.Postcode).padStart(4, "0");
  const city = value(a.CityTown || a.MailTown);
  const suburb = value(a.Suburb);
  const locality = (line: string) => line === suburb || line === city || line === `${city} ${postcode}` || line === postcode;
  return { display: lines.join(", "), street_address: lines.filter(line => !locality(line)).join(", "), suburb, city, postcode: value(a.Postcode) ? postcode : "", provider: "nzpost", dpid };
}
