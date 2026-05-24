import { requireAdmin } from "@/lib/auth";
import UsersManager from "@/components/admin/UsersManager";
export default async function UsersPage(){ await requireAdmin("users"); return <div><h1 className="text-3xl font-extrabold">Manage Admin Users</h1><UsersManager /></div> }
