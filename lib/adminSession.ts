import { createHmac, timingSafeEqual } from "node:crypto";
export const ADMIN_SESSION_COOKIE = "akcc_admin_session";
export const ADMIN_SESSION_SECONDS = 600;
function signature(value: string) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Admin session configuration unavailable.");
  return createHmac("sha256", key).update(`akcc-admin:${value}`).digest("hex");
}
export function issueAdminSession(userId: string, now = Date.now()) {
  const expiresAt = now + ADMIN_SESSION_SECONDS * 1000;
  const value = `${userId}:${expiresAt}`;
  return { token: `${value}:${signature(value)}`, expiresAt };
}
export function validAdminSession(token: string | undefined, userId: string, now = Date.now()) {
  if (!token) return null;
  const [id, expiry, supplied, ...rest] = token.split(":");
  const expiresAt = Number(expiry);
  if (rest.length || id !== userId || !Number.isSafeInteger(expiresAt) || expiresAt <= now || expiresAt > now + ADMIN_SESSION_SECONDS * 1000 || !/^[a-f0-9]{64}$/.test(supplied || "")) return null;
  const expected = signature(`${id}:${expiry}`);
  return timingSafeEqual(Buffer.from(supplied), Buffer.from(expected)) ? expiresAt : null;
}
