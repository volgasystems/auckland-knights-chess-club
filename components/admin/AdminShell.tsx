import Link from "next/link";
import Image from "next/image";
import AdminNav from "@/components/admin/AdminNav";
import { displayName } from "@/lib/auth";
export default function AdminShell({ admin, children }: { admin: any; children: React.ReactNode }) {
  return <div className="min-h-screen bg-stone-100">
    <header className="sticky top-0 z-30 bg-black text-white shadow-sm">
      <div className="flex items-center justify-between px-5 py-3">
        <Link href="/club-admin/dashboard" className="flex items-center gap-3">
          <Image src="/logo.png" alt="AKCC" width={64} height={64} className="h-14 w-14 rounded-full object-contain"/>
          <div><b>Auckland Knights</b><div className="text-xs uppercase tracking-wider text-akcc-gold">Club Admin</div></div>
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/club-admin/profile" className="hidden hover:text-akcc-gold sm:block">{displayName(admin.profile, admin.user.email)}</Link>
          <form action="/club-admin/logout" method="post"><button className="rounded-full bg-white px-4 py-2 font-bold text-black hover:bg-akcc-gold">Sign out</button></form>
        </div>
      </div>
    </header>
    <div className="lg:flex lg:min-h-[calc(100vh-80px)]">
      <AdminNav role={admin.profile.role}/>
      <main className="min-w-0 flex-1 px-5 py-8 lg:px-8">{children}</main>
    </div>
  </div>
}
