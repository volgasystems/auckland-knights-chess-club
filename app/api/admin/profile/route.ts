import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
export async function PATCH(req: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Session expired. Sign in again." }, { status: 401 });
  try {
    const body = await req.json();
    const clean: Record<string, string> = {};
    for (const key of ["first_name", "last_name", "phone"]) {
      if (typeof body[key] !== "string" || body[key].trim().length > (key === "phone" ? 40 : 100)) return NextResponse.json({ error: "Enter valid profile details." }, { status: 400 });
      clean[key] = body[key].trim();
    }
    if (!clean.first_name || !clean.last_name) return NextResponse.json({ error: "First and last name are required." }, { status: 400 });
    const { error } = await createSupabaseServiceClient().from("profiles").update({ ...clean, full_name: `${clean.first_name} ${clean.last_name}`, updated_at: new Date().toISOString() }).eq("id", admin.user.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Unable to save profile." }, { status: 400 }); }
}
