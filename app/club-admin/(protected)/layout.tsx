import { requireAdmin } from "@/lib/auth";
import AdminShell from "@/components/admin/AdminShell";
export default async function ClubAdminLayout({ children }: { children: React.ReactNode }) { const admin = await requireAdmin("dashboard"); return <AdminShell admin={admin}>{children}</AdminShell> }
