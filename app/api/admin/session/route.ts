import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ADMIN_SESSION_COOKIE, ADMIN_SESSION_SECONDS, issueAdminSession } from "@/lib/adminSession";

export async function POST() {
  try {
    const s = await createSupabaseServerClient();
    const { data: { user } } = await s.auth.getUser();
    const signedIn = Date.parse(user?.last_sign_in_at || "");
    // A refresh token cannot repeatedly establish a new admin session.
    if (!user || !Number.isFinite(signedIn) || Math.abs(Date.now() - signedIn) > 30000) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
    const session = issueAdminSession(user.id, signedIn);
    (await cookies()).set(ADMIN_SESSION_COOKIE, session.token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: ADMIN_SESSION_SECONDS });
    return NextResponse.json({ expiresAt: session.expiresAt });
  } catch { return NextResponse.json({ error: "Unable to start admin session. Please sign in again." }, { status: 503 }); }
}
