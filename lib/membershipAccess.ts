import { createHmac, timingSafeEqual } from "node:crypto";
function key() { const value = process.env.SUPABASE_SERVICE_ROLE_KEY; if (!value) throw new Error("Membership access unavailable"); return value; }
export function memberAccessToken(member: { id: string; email: string }, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ id: member.id, email: member.email.toLowerCase(), expires: now + 30 * 60 * 1000, scope: "membership-renewal" })).toString("base64url");
  return `${payload}.${createHmac("sha256", key()).update(payload).digest("base64url")}`;
}
export function readMemberAccessToken(token: unknown, now = Date.now()) {
  try {
    if (typeof token !== "string" || token.length > 2000) return null;
    const [payload, signature, extra] = token.split("."); if (!payload || !signature || extra) return null;
    const expected = createHmac("sha256", key()).update(payload).digest(); const actual = Buffer.from(signature, "base64url");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
    const value = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (value.scope !== "membership-renewal" || typeof value.id !== "string" || typeof value.email !== "string" || !Number.isFinite(value.expires) || value.expires <= now) return null;
    return value as { id: string; email: string; expires: number };
  } catch { return null; }
}
export function recoveryClaim(email: string, now = Date.now()) {
  const hex = createHmac("sha256", key()).update(`member-recovery:${email}:${Math.floor(now / 60000)}`).digest("hex").slice(0, 32);
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
