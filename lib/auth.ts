import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, validAdminSession } from "@/lib/adminSession";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { AdminArea, canAccess } from "@/lib/roles";

export async function getCurrentAdmin() {
  // Reject an expired cookie before attempting a remote token refresh.
  const token = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  let expiresAt: number | null;
  try { expiresAt = validAdminSession(token, token?.split(":")[0] || ""); }
  catch { return null; }
  if (!expiresAt) return null;
  const supabase = await createSupabaseServerClient();
  const result = await supabase.auth.getUser().catch(() => null);
  const user = result?.data?.user;
  if (!user || !validAdminSession(token, user.id)) return null;
  const service = createSupabaseServiceClient();
  const { data: profile } = await service
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || !profile.is_active) return null;
  return { user, profile, expiresAt };
}

export async function requireAdmin(area: AdminArea = "dashboard") {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/club-admin/login");
  if (!canAccess(admin.profile.role, area)) redirect("/club-admin/login?error=permission");
  return admin;
}

export function displayName(profile: any, userEmail?: string | null) {
  if (profile?.full_name?.trim()) return profile.full_name.trim();
  const firstLast = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ");
  if (firstLast.trim()) return firstLast.trim();
  if (profile?.email?.includes("@")) return profile.email.split("@")[0];
  if (userEmail?.includes("@")) return userEmail.split("@")[0];
  return "User";
}
