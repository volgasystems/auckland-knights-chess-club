import { requireAdmin } from "@/lib/auth";
import UsersManager from "@/components/admin/UsersManager";

export default async function UsersPage() {
  const admin = await requireAdmin("users");
  return <UsersManager currentUserId={admin.profile.id} />;
}
