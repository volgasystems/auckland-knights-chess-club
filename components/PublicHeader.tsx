import Link from "next/link";
import Image from "next/image";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { MapPin, Mail } from "lucide-react";
import MobilePublicNav from "@/components/MobilePublicNav";

const mainLinks: [string, string][] = [
  ["/", "Home"],
  ["/tournaments", "Tournaments"],
  ["/calendar", "Calendar"],
  ["/results", "Results"],
  ["/news", "News"],
  ["/photo-gallery", "Gallery"],
  ["/coaching", "Coaching"],
  ["/live-boards", "Live Boards"]
];

function SocialIcon({ label }: { label: string }) {
  if (label === "Facebook") return <span className="text-sm font-black">f</span>;
  if (label === "Instagram") return <span className="text-sm font-black">◎</span>;
  if (label === "YouTube") return <span className="text-sm font-black">▶</span>;
  return <span className="text-sm font-black">{label === "X" ? "𝕏" : label[0]}</span>;
}

export default async function PublicHeader() {
  let settings: any = null;
  try {
    const service = createSupabaseServiceClient();
    const { data } = await service.from("club_settings").select("*").eq("id", "default").maybeSingle();
    settings = data;
  } catch {}

  const socialLinks = [
    ["Facebook", settings?.facebook_url],
    ["Instagram", settings?.instagram_url],
    ["YouTube", settings?.youtube_url],
    ["X", settings?.x_url]
  ].filter(([, url]) => !!url);

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/95 shadow-sm backdrop-blur">
      <div className="bg-black text-white">
        <div className="container-page flex h-8 items-center justify-between gap-4 text-xs sm:text-sm">
          <span className="flex min-w-0 items-center gap-2 truncate"><Mail className="h-3.5 w-3.5 text-akcc-gold" />{settings?.general_email || "info@aucklandknights.co.nz"}</span>
          <span className="hidden items-center gap-2 whitespace-nowrap md:flex"><MapPin className="h-3.5 w-3.5 text-akcc-gold" />East Auckland & South Auckland</span>
          {socialLinks.length > 0 && (
            <div className="hidden items-center gap-3 lg:flex">
              {socialLinks.map(([label, url]) => (
                <a key={String(label)} href={String(url)} target="_blank" rel="noreferrer" aria-label={String(label)} className="text-white/90 hover:text-akcc-gold">
                  <SocialIcon label={String(label)} />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="container-page relative flex min-h-20 items-center justify-between gap-4 py-3 lg:min-h-24">
        <Link href="/" className="flex min-w-0 shrink-0 items-center gap-3 sm:gap-4">
          <Image src="/logo.png" alt="Auckland Knights Chess Club" width={96} height={96} priority className="h-14 w-14 rounded-full object-contain shadow-sm sm:h-[72px] sm:w-[72px]" />
          <div className="leading-tight">
            <div className="text-lg font-black uppercase tracking-wide text-black sm:text-2xl lg:text-[1.65rem]">Auckland Knights</div>
            <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.28em] text-black sm:text-sm sm:tracking-[0.32em]">Chess Club</div>
          </div>
        </Link>
        <nav className="hidden flex-1 items-center justify-end gap-4 lg:flex xl:gap-5">
          {mainLinks.map(([href, label]) => (
            <Link key={href} href={href} className="whitespace-nowrap text-[15px] font-extrabold text-stone-700 hover:text-black xl:text-base">{label}</Link>
          ))}
        </nav>
        <Link href="/join" className="btn-gold hidden shrink-0 sm:inline-flex">Join Now</Link>
        <MobilePublicNav links={mainLinks} />
      </div>
    </header>
  );
}
