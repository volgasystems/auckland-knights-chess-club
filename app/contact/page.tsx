import PageShell from "@/components/PageShell";
import ContactForm from "@/components/ContactForm";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export default async function ContactPage(){
  const service=createSupabaseServiceClient();
  const {data:s}=await service.from("club_settings").select("*").eq("id","default").maybeSingle();
  const mapAddress=s?.club_address || "East Auckland, New Zealand";
  const mapSrc=`https://maps.google.com/maps?q=${encodeURIComponent(mapAddress)}&output=embed`;
  return <PageShell><main className="container-page py-12">
    <h1 className="text-4xl font-extrabold">Contact Us</h1>
    <p className="mt-3 max-w-3xl text-slate-600">Contact Auckland Knights Chess Club for membership, tournaments, coaching, junior chess, live boards or website enquiries.</p>
    <div className="mt-8 grid gap-6 lg:grid-cols-2">
      <section className="card p-6"><h2 className="text-xl font-extrabold">Club Details</h2><div className="mt-4 space-y-3 text-slate-700"><p><b>Address:</b> {mapAddress}</p><p><b>Email:</b> {s?.general_email || "info@aucklandknights.co.nz"}</p>{(s?.senior_club_captain_name || s?.club_captain_name) && <p><b>Senior Club Captain:</b> {s?.senior_club_captain_name || s?.club_captain_name} {s?.senior_club_captain_email && `- ${s.senior_club_captain_email}`}</p>}{s?.junior_club_captain_name && <p><b>Junior Club Captain:</b> {s.junior_club_captain_name} {s?.junior_club_captain_email && `- ${s.junior_club_captain_email}`}</p>}</div></section>
      <ContactForm />
    </div>
    <section className="card mt-6 overflow-hidden"><iframe title="Club map" src={mapSrc} className="h-96 w-full border-0" loading="lazy" /></section>
  </main></PageShell>
}
