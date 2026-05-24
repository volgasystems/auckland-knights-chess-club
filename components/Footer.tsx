import Link from "next/link";
import Image from "next/image";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

const quickLinks = [
  ["/about", "About Us"],
  ["/contact", "Contact Us"],
  ["/faq", "F.A.Q."],
  ["/agm", "AGM & Notices"],
  ["/links", "Links"],
  ["/calendar", "Calendar"],
  ["/absence", "Report Absence"],
  ["/tournaments", "Tournaments"],
  ["/results", "Results"],
  ["/install-app", "Install App"]
];

const usefulChessLinks = [
  ["NZCF", "https://newzealandchess.co.nz/"],
  ["Auckland Chess Association / ACA", "https://chessauckland.nz/"],
  ["New Zealand Chess", "https://newzealandchess.nz/"]
];

function SocialIcon({ label }: { label: string }) {
  if (label === "Facebook") return <span className="text-lg font-black">f</span>;
  if (label === "Instagram") return <span className="text-lg font-black">◎</span>;
  if (label === "YouTube") return <span className="text-lg font-black">▶</span>;
  return <span className="font-black">{label === "X" ? "𝕏" : label[0]}</span>;
}

export default async function Footer() {
  let settings: any = null;
  try {
    const service = createSupabaseServiceClient();
    const { data } = await service.from("club_settings").select("*").eq("id", "default").maybeSingle();
    settings = data;
  } catch {}
  const social = [
    ["Facebook", settings?.facebook_url],
    ["Instagram", settings?.instagram_url],
    ["YouTube", settings?.youtube_url],
    ["Lichess", settings?.lichess_url],
    ["X", settings?.x_url],
    ["LinkedIn", settings?.linkedin_url]
  ].filter(([, url]) => !!url);

  return (
    <footer className="bg-black text-white">
      <div className="container-page grid gap-8 py-10 md:grid-cols-5">
        <div className="md:col-span-2">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Auckland Knights" width={80} height={80} className="h-16 w-16 rounded-full object-contain sm:h-20 sm:w-20" />
            <div>
              <div className="font-bold">Auckland Knights Chess Club</div>
              <div className="text-sm text-akcc-gold">Strategy. Community. Excellence.</div>
            </div>
          </div>
          <p className="mt-4 max-w-md text-sm text-stone-300">Serving East Auckland and South Auckland with tournaments, coaching, junior development and community chess events.</p>
          {social.length > 0 && <div className="mt-5">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-white">Stay Connected</h3>
            <div className="flex flex-wrap gap-3 text-sm font-bold text-white">
              {social.map(([label, url], index) => <a key={String(label)} href={String(url)} target="_blank" rel="noreferrer" aria-label={String(label)} className={`inline-flex h-11 w-11 items-center justify-center border transition hover:border-akcc-gold hover:bg-akcc-gold hover:text-black ${index % 2 ? "border-white/25 bg-white/10" : "border-white/15 bg-black"}`}><SocialIcon label={String(label)} /></a>)}
            </div>
          </div>}
        </div>
        <div>
          <h3 className="font-bold text-white">Quick Links</h3>
          <div className="mt-3 grid gap-2 text-sm text-stone-300">
            {quickLinks.map(([href, label]) => <Link key={href} href={href} className="hover:text-akcc-gold">{label}</Link>)}
          </div>
        </div>
        <div>
          <h3 className="font-bold text-white">Useful Chess Links</h3>
          <div className="mt-3 grid gap-2 text-sm text-stone-300">
            {usefulChessLinks.map(([label, href]) => <a key={label} href={href} target="_blank" rel="noreferrer" className="hover:text-akcc-gold">{label}</a>)}
          </div>
        </div>
        <div>
          <h3 className="font-bold text-white">Contact Us</h3>
          <div className="mt-3 space-y-2 text-sm text-stone-300">
            <p>{settings?.club_address || "East Auckland / South Auckland, New Zealand"}</p>
            <p>{settings?.general_email || "info@aucklandknights.co.nz"}</p>
            {(settings?.senior_club_captain_name || settings?.club_captain_name) && <p>Senior Club Captain: {settings?.senior_club_captain_name || settings?.club_captain_name}</p>}
            {settings?.junior_club_captain_name && <p>Junior Club Captain: {settings.junior_club_captain_name}</p>}
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 px-4 py-4 text-center text-xs text-stone-300">
        <p>© 2026 Auckland Knights Chess Club. All rights reserved.</p>
        <p className="mt-1">Powered by FocalCXM New Zealand Limited and Volga Systems (NZ) Limited.</p>
      </div>
    </footer>
  );
}
