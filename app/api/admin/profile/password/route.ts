import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentAdmin } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ADMIN_SESSION_COOKIE } from "@/lib/adminSession";
export async function POST(req: Request) {
  const admin = await getCurrentAdmin();
  if (!admin || !admin.user.email) return NextResponse.json({ error: "Session expired. Sign in again." }, { status: 401 });
  try {
    const { current_password, new_password } = await req.json();
    if (typeof current_password !== "string" || typeof new_password !== "string" || new_password.length < 12 || new_password.length > 128 || current_password === new_password) return NextResponse.json({ error: "Use a different password with 12–128 characters." }, { status: 400 });
    const s = await createSupabaseServerClient();
    const verified = await s.auth.signInWithPassword({ email: admin.user.email, password: current_password });
    if (verified.error || verified.data.user?.id !== admin.user.id) return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
    const updated = await s.auth.updateUser({ password: new_password });
    if (updated.error) return NextResponse.json({ error: "Password could not be changed. Check the password requirements and try again." }, { status: 400 });
    await s.auth.signOut();
    (await cookies()).delete(ADMIN_SESSION_COOKIE);
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Unable to change password." }, { status: 400 }); }
}
