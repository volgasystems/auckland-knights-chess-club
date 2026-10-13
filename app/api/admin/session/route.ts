import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentAdmin } from "@/lib/auth";
import { canAccess } from "@/lib/roles";
import { ADMIN_SESSION_COOKIE, ADMIN_SESSION_SECONDS, issueAdminSession } from "@/lib/adminSession";

const noCache = { "Cache-Control": "no-store" };
export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Session expired. Please sign in again." }, { status: 401, headers: noCache });
  return NextResponse.json({ remainingMs: Math.max(0, admin.expiresAt - Date.now()) }, { headers: noCache });
}
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    let userId: string;
    let start = Date.now();
    if (body.renew === true) {
      // Activity can extend only an existing, unexpired admin session.
      const admin = await getCurrentAdmin();
      if (!admin) return NextResponse.json({ error: "Please sign in again." }, { status: 401, headers: noCache });
      userId = admin.user.id;
    } else {
      const s = await createSupabaseServerClient();
      const { data: { user } } = await s.auth.getUser();
      const signedIn = Date.parse(user?.last_sign_in_at || "");
      if (!user || !Number.isFinite(signedIn) || Math.abs(start - signedIn) > 30000) return NextResponse.json({ error: "Please sign in again." }, { status: 401, headers: noCache });
      const { createSupabaseServiceClient } = await import("@/lib/supabase/service");
      const { data: profile } = await createSupabaseServiceClient().from("profiles").select("role,is_active").eq("id", user.id).maybeSingle();
      if (!profile?.is_active || !canAccess(profile.role, "dashboard")) return NextResponse.json({ error: "Admin access is not available for this account." }, { status: 403, headers: noCache });
      userId = user.id;
      start = Math.min(start, signedIn);
    }
    const session = issueAdminSession(userId, start);
    (await cookies()).set(ADMIN_SESSION_COOKIE, session.token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: ADMIN_SESSION_SECONDS });
    return NextResponse.json({ remainingMs: Math.max(0, session.expiresAt - Date.now()) }, { headers: noCache });
  } catch { return NextResponse.json({ error: "Unable to start admin session. Please sign in again." }, { status: 503, headers: noCache }); }
}
