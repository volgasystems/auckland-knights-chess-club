"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { canAccess } from "@/lib/roles";
const items = [
  ["dashboard", "/club-admin/dashboard", "Dashboard"],
  ["documentation", "/club-admin/documentation", "Documentation"],
  ["users", "/club-admin/users", "Users"],
  ["members", "/club-admin/members", "Members"],
  ["membership_options", "/club-admin/membership-options", "Membership Fees & Options"],
  ["tournaments", "/club-admin/tournaments", "Tournaments"],
  ["calendar", "/club-admin/calendar", "Calendar"],
  ["tournament_registrations", "/club-admin/tournament-registrations", "Tournament Registrations"],
  ["results", "/club-admin/results", "Results"],
  ["news", "/club-admin/news", "News"],
  ["social_posts", "/club-admin/social-posts", "Social Posts"],
  ["member_notices", "/club-admin/member-notices", "Member Notices"],
  ["email_templates", "/club-admin/email-templates", "Email Templates"],
  ["bulk_email", "/club-admin/bulk-email", "Bulk Email"],
  ["email_diagnostics", "/club-admin/email-diagnostics", "Email Diagnostics"],
  ["gallery", "/club-admin/photo-gallery", "Photo Gallery"],
  ["live_boards", "/club-admin/live-boards", "Live Boards"],
  ["coaching", "/club-admin/coaching", "Coaching"],
  ["agm", "/club-admin/agm", "AGM & Notices"],
  ["faq", "/club-admin/faq", "F.A.Q."],
  ["absences", "/club-admin/absences", "Absences"],
  ["enquiries", "/club-admin/enquiries", "Enquiries"],
  ["settings", "/club-admin/settings", "Settings"]
] as const;
export default function AdminNav({ role }: { role: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const visible = items.filter(([area])=>canAccess(role, area as any));
  const LinkList = ({ mobile = false }: { mobile?: boolean }) => <>
    {visible.map(([_,href,label])=>{
      const active = pathname === href || pathname.startsWith(href + "/");
      return <Link key={href} href={href} onClick={() => mobile && setOpen(false)} className={`block whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-bold transition ${active ? "bg-black text-white" : "border border-stone-200 text-stone-700 hover:border-black hover:text-black lg:border-transparent lg:hover:bg-stone-100"}`}>{label}</Link>
    })}
  </>;
  return <aside className="w-full shrink-0 border-b bg-white lg:sticky lg:top-[80px] lg:h-[calc(100vh-80px)] lg:w-72 lg:overflow-y-auto lg:border-b-0 lg:border-r">
    <div className="flex items-center justify-between p-3 lg:hidden">
      <span className="text-sm font-extrabold uppercase tracking-wide text-stone-700">Admin Menu</span>
      <button type="button" onClick={() => setOpen((v)=>!v)} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-stone-300 bg-white text-black" aria-label="Toggle admin menu">
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
    </div>
    {open && <div className="grid gap-2 border-t p-3 lg:hidden"><LinkList mobile /></div>}
    <div className="hidden p-4 lg:block"><LinkList /></div>
  </aside>
}
