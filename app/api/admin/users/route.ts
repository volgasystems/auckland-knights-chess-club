import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { ROLES } from "@/lib/roles";

async function requireSuperAdmin() {
  const admin = await getCurrentAdmin();
  if (admin?.profile.role !== "super_admin") return null;
  return admin;
}

export async function GET() {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: "Super Admin only" }, { status: 403 });
  const s = createSupabaseServiceClient();
  const { data, error } = await s.from("profiles").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ users: data });
}

export async function POST(req: Request) {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: "Super Admin only" }, { status: 403 });
  const body = await req.json();
  const s = createSupabaseServiceClient();

  if (body.action === "create") {
    const first_name = String(body.first_name || "").trim();
    const last_name = String(body.last_name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "").trim();
    const role = ROLES.includes(body.role) ? body.role : "member";
    if (!email || !password || !first_name) return NextResponse.json({ error: "First name, email and password are required." }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });

    const { data: created, error: createError } = await s.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name, last_name, full_name: [first_name, last_name].filter(Boolean).join(" ") },
    });
    if (createError) return NextResponse.json({ error: createError.message }, { status: 400 });
    const id = created.user?.id;
    if (!id) return NextResponse.json({ error: "User was not created." }, { status: 400 });
    const full_name = [first_name, last_name].filter(Boolean).join(" ");
    const { error } = await s.from("profiles").upsert({ id, email, first_name, last_name, full_name, role, is_active: true, updated_at: new Date().toISOString() });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  const { id, role, is_active, first_name, last_name } = body;
  if (!id) return NextResponse.json({ error: "Missing user id." }, { status: 400 });
  if (!ROLES.includes(role)) return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  const full_name = [first_name, last_name].filter(Boolean).join(" ");
  const { error } = await s.from("profiles").update({ role, is_active, first_name, last_name, full_name, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: "Super Admin only" }, { status: 403 });
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing user id." }, { status: 400 });
  if (id === admin.profile.id) return NextResponse.json({ error: "You cannot delete your own Super Admin account while logged in." }, { status: 400 });
  const s = createSupabaseServiceClient();
  const { error } = await s.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await s.from("profiles").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}
