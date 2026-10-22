import { publicClubSettings } from "@/lib/publicClubSettings";
import { clubSocialLinks } from "@/lib/clubIdentity";
import SocialIcon from "@/components/SocialIcon";
import { clubContactEmail, CLUB_CONTACT_PHONE, CLUB_CONTACT_PHONE_LINK } from "@/lib/clubContact";
import Link from "next/link";
import Image from "next/image";
import { MapPin, Mail, Phone } from "lucide-react";
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

export default async function PublicHeader() {
  const settings = await publicClubSettings();
  const socialLinks = clubSocialLinks(settings);

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/95 shadow-sm backdrop-blur">
      <div className="bg-black text-white">
        <div className="container-page flex min-h-9 flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2 text-xs sm:text-sm">
          <a href={`mailto:${clubContactEmail(settings)}`} className="hidden min-w-0 items-center gap-2 truncate sm:flex"><Mail className="h-3.5 w-3.5 text-akcc-gold" />{clubContactEmail(settings)}</a><a href={CLUB_CONTACT_PHONE_LINK} className="flex items-center gap-2 whitespace-nowrap"><Phone className="h-3.5 w-3.5 text-akcc-gold" />{CLUB_CONTACT_PHONE}</a><Link href="/contact" className="font-bold hover:text-akcc-gold">Contact</Link>
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
        <Link href="/join" className="btn-gold hidden shrink-0 sm:inline-flex">Join the Club</Link>
        <MobilePublicNav links={mainLinks} />
      </div>
    </header>
  );
}
