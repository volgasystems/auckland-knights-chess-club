import { requireAdmin, displayName } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/roles";
export default async function Profile(){ const admin=await requireAdmin("dashboard"); return <div><h1 className="text-3xl font-extrabold">My Profile</h1><div className="card mt-6 max-w-2xl p-6"><p><b>Name:</b> {displayName(admin.profile, admin.user.email)}</p><p className="mt-2"><b>Email:</b> {admin.profile.email || admin.user.email}</p><p className="mt-2"><b>Role:</b> {(ROLE_LABELS as any)[admin.profile.role] || admin.profile.role}</p></div></div> }
