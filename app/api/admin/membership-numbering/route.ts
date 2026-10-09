import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { canAccess } from "@/lib/roles";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
export async function POST(req: Request) {
  const admin = await getCurrentAdmin();
  if (!admin || !canAccess(admin.profile.role, "settings")) return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  try {
    const body = await req.json(); const prefix = String(body.prefix || "").trim().toUpperCase(); const start = Number(body.start); const digits = Number(body.digits);
    if (!/^[A-Z][A-Z0-9-]{0,11}$/.test(prefix) || !Number.isSafeInteger(start) || start < 1 || start > 999999999 || !Number.isInteger(digits) || digits < 1 || digits > 9) return NextResponse.json({ error: "Enter a valid prefix, positive start number (up to 999999999) and 1–9 digits." }, { status: 400 });
    const { data, error } = await createSupabaseServiceClient().rpc("configure_membership_numbering", { p_prefix: prefix, p_start: start, p_digits: digits });
    if (error) return NextResponse.json({ error: ["PGRST202", "42883"].includes(error.code) ? "Database upgrade required: run supabase/migration_v4_4_membership_numbering.sql in the Supabase SQL editor. Existing membership payments continue using the legacy sequence." : "Numbering could not be saved. Existing IDs are unchanged." }, { status: 400 });
    return NextResponse.json(data);
  } catch { return NextResponse.json({ error: "Could not save membership numbering." }, { status: 503 }); }
}
