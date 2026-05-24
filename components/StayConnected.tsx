import { Mail, Phone } from "lucide-react";

function Icon({ label }: { label: string }) {
  if (label === "Phone") return <Phone className="h-6 w-6" />;
  if (label === "Email") return <Mail className="h-6 w-6" />;
  if (label === "Instagram") return <span className="text-2xl font-black leading-none">◎</span>;
  if (label === "YouTube") return <span className="text-2xl font-black leading-none">▶</span>;
  if (label === "Facebook") return <span className="text-2xl font-black leading-none">f</span>;
  if (label === "X") return <span className="text-xl font-black leading-none">𝕏</span>;
  if (label === "Lichess") return <span className="text-xl font-black leading-none">♞</span>;
  return <span className="text-xl font-black leading-none">{label[0]}</span>;
}

export default function StayConnected({ settings }: { settings: any }) {
  const phone = settings?.senior_club_captain_phone || settings?.club_captain_phone || settings?.general_phone;
  const email = settings?.general_email || "info@aucklandknights.co.nz";
  const links = [
    ["Phone", phone ? `tel:${String(phone).replace(/\s+/g, "")}` : ""],
    ["Instagram", settings?.instagram_url],
    ["YouTube", settings?.youtube_url],
    ["Facebook", settings?.facebook_url],
    ["X", settings?.x_url],
    ["Lichess", settings?.lichess_url],
    ["Email", email ? `mailto:${email}` : ""],
  ].filter(([, url]) => !!url) as [string, string][];

  if (links.length === 0) return null;

  return (
    <section className="relative overflow-hidden bg-black py-10 text-white">
      <div className="absolute inset-0 chessboard-subtle opacity-20" />
      <div className="container-page relative text-center">
        <h2 className="text-2xl font-bold tracking-wide">Stay Connected</h2>
        <div className="mt-6 flex flex-wrap justify-center gap-4">
          {links.map(([label, url], index) => (
            <a
              key={label}
              href={url}
              target={url.startsWith("http") ? "_blank" : undefined}
              rel={url.startsWith("http") ? "noreferrer" : undefined}
              aria-label={label}
              className={`inline-flex h-16 w-16 items-center justify-center border text-white transition hover:border-akcc-gold hover:bg-akcc-gold hover:text-black ${index % 2 ? "border-white/25 bg-white/10" : "border-white/15 bg-black"}`}
            >
              <Icon label={label} />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
