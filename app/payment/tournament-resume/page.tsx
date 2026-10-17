import PageShell from "@/components/PageShell";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { verifyPaymentResumeToken, paymentOpen, unpaidEntry } from "@/lib/tournamentPaymentReminder";
export const dynamic = "force-dynamic";
export const metadata = {title:"Continue tournament payment", robots:{index:false,follow:false}, referrer:"no-referrer"};
export default async function ResumePayment({searchParams}:{searchParams:Promise<{token?:string;notice?:string}>}) {
  const sp = await searchParams;
  let entry:any = null;
  try {
    const id = verifyPaymentResumeToken(sp.token || "");
    if (id) { const result = await createSupabaseServiceClient().from("tournament_registrations").select("first_name,last_name,payment_status,registration_status,entry_fee_cents,tournaments(*)").eq("id",id).single(); if (!result.error) entry=result.data; }
  } catch {}
  const messages:Record<string,string> = {settled:"This entry no longer needs payment. Check your confirmation or contact the club.",closed:"Registration payment is now closed. Contact the club.",membership:"An active club membership is required for this club event. Contact the club.",full:"This tournament has reached capacity. Contact the club before paying.",review:"We could not safely resume payment. Do not register or pay again if your bank shows a charge. Contact the club with your entry reference."};
  const canPay = entry && unpaidEntry(entry) && paymentOpen(entry.tournaments) && !sp.notice;
  return <PageShell><main className="container-page py-16"><section className="card mx-auto max-w-2xl p-8"><h1 className="text-2xl font-extrabold">Continue tournament payment</h1>{entry ? <><h2 className="mt-4 text-xl font-bold">{entry.tournaments.title}</h2><p className="mt-2">Player: {entry.first_name} {entry.last_name}</p><p>Entry fee: NZ${(Number(entry.entry_fee_cents)/100).toFixed(2)}</p><p className="mt-4">{sp.notice ? messages[sp.notice] || messages.review : canPay ? "Continue payment for your existing entry. Do not submit another registration. Payment will be checked before opening checkout." : "This entry is already settled, cancelled, or no longer open for payment. Contact the club if you need help."}</p>{canPay && <form action="/api/tournaments/payment-resume" method="post" className="mt-5"><input type="hidden" name="token" value={sp.token}/><button className="btn-primary">Check and continue payment</button></form>}</> : <p className="mt-4">This payment link is invalid or expired. Contact the club for help.</p>}<p className="mt-5 text-sm">If your bank shows a payment, do not pay again. Contact <a href="mailto:akcc.nzchess@gmail.com" className="underline">akcc.nzchess@gmail.com</a> or 022 179 3499.</p></section></main></PageShell>;
}
