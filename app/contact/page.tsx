import { clubContactEmail, CLUB_CONTACT_PHONE, CLUB_CONTACT_PHONE_LINK } from "@/lib/clubContact";
import PageShell from "@/components/PageShell";
import ContactForm from "@/components/ContactForm";
import { publicClubSettings } from "@/lib/publicClubSettings";
import { clubSocialLinks } from "@/lib/clubIdentity";
import SocialIcon from "@/components/SocialIcon";
import Link from "next/link";

export default async function ContactPage(){
  const s = await publicClubSettings();
  const socials = clubSocialLinks(s);
  const mapAddress=s?.club_address || "East Auckland, New Zealand";
  const mapSrc=`https://maps.google.com/maps?q=${encodeURIComponent(mapAddress)}&output=embed`;
  return <PageShell><main className="container-page py-12">
    <h1 className="text-4xl font-extrabold">Contact Us</h1>
    <p className="mt-3 max-w-3xl text-slate-600">Contact Auckland Knights Chess Club for membership, tournaments, coaching, junior chess, live boards or website enquiries.</p>
    <div className="mt-8 grid gap-6 lg:grid-cols-2">
      <section className="card p-6"><h2 className="text-xl font-extrabold">Club Details</h2><div className="mt-4 space-y-3 text-slate-700"><p><b>Address:</b> {mapAddress}</p><p><b>Email:</b> <a href={`mailto:${clubContactEmail(s)}`} className="underline">{clubContactEmail(s)}</a></p><p><b>Phone:</b> <a href={CLUB_CONTACT_PHONE_LINK} className="underline">{CLUB_CONTACT_PHONE}</a></p>{(s?.senior_club_captain_name || s?.club_captain_name) && <p><b>Senior Club Captain:</b> {s?.senior_club_captain_name || s?.club_captain_name} {s?.senior_club_captain_email && `- ${s.senior_club_captain_email}`}</p>}{s?.junior_club_captain_name && <p><b>Junior Club Captain:</b> {s.junior_club_captain_name} {s?.junior_club_captain_email && `- ${s.junior_club_captain_email}`}</p>}</div></section>
      <ContactForm />
      <section className="card p-6"><h2 className="text-xl font-extrabold">Club meetings</h2>{s?.main_club_schedule && <p className="mt-3 whitespace-pre-line"><b>Main club:</b> {s.main_club_schedule}</p>}{s?.junior_club_schedule && <p className="mt-3 whitespace-pre-line"><b>Junior club:</b> {s.junior_club_schedule}</p>}<p className="mt-3 text-slate-700">Check the <Link href="/calendar" className="underline">Calendar</Link> for current meeting and event details, or contact us to confirm the time and venue before visiting.</p></section>
      {socials.length > 0 && <section className="card p-6"><h2 className="text-xl font-extrabold">Follow Auckland Knights</h2><div className="mt-4 flex flex-wrap gap-3">{socials.map(([label,url])=><a key={label} href={url} target="_blank" rel="noopener noreferrer" className="btn-secondary gap-2"><SocialIcon label={label}/>{label}</a>)}</div></section>}
    </div>
    <section className="card mt-6 overflow-hidden"><iframe title="Club map" src={mapSrc} className="h-96 w-full border-0" loading="lazy" /></section>
  </main></PageShell>
}
