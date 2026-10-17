import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getStripe } from "@/lib/stripe";
import { assertPaymentReady, paymentConfiguration } from "@/lib/paymentConfig";
import { verifyPaymentResumeToken, paymentOpen, unpaidEntry, inspectEntryPayment, paymentDeadline } from "@/lib/tournamentPaymentReminder";
export async function POST(req: Request) {
  let token = "";
  const site = paymentConfiguration().siteUrl;
  try {
    const origin = req.headers.get("origin");
    if (origin && origin !== site) return NextResponse.json({error:"Not authorised"},{status:403});
    token = String((await req.formData()).get("token") || "");
    const id = verifyPaymentResumeToken(token);
    if (!id) return NextResponse.json({error:"This payment link is invalid or expired. Contact the club."},{status:400});
    const s = createSupabaseServiceClient();
    const {data:r,error} = await s.from("tournament_registrations").select("*, tournaments(*)").eq("id",id).single();
    if (error || !r) throw new Error("review");
    if (!unpaidEntry(r)) throw new Error("settled");
    const result = await inspectEntryPayment(s,r);
    if (result.state !== "unpaid") throw new Error(result.state === "paid" ? "settled" : "review");
    const t = r.tournaments;
    if (!paymentOpen(t)) throw new Error("closed");
    if (t.tournament_type !== "general_open") {
      const today = new Intl.DateTimeFormat("en-CA", {timeZone:"Pacific/Auckland"}).format(new Date());
      const member = await s.from("club_memberships").select("id").eq("membership_id",r.membership_id).in("payment_status",["paid","manual_paid","waived"]).eq("membership_status","active").gte("membership_end_date",today).maybeSingle();
      if (member.error || !member.data) throw new Error("membership");
    }
    const dup = await s.from("tournament_registrations").select("id").eq("tournament_id",r.tournament_id).eq("payment_status","paid").eq("registration_status","confirmed").ilike("first_name",String(r.first_name).replace(/[\\%_]/g,"\\$&")).ilike("last_name",String(r.last_name).replace(/[\\%_]/g,"\\$&")).eq("date_of_birth",r.date_of_birth);
    if (dup.error || dup.data?.length) throw new Error("review");
    if (t.max_players) {
      const count = await s.from("tournament_registrations").select("id",{count:"exact",head:true}).eq("tournament_id",r.tournament_id).eq("payment_status","paid").eq("registration_status","confirmed");
      if (count.error || Number(count.count) >= Number(t.max_players)) throw new Error("full");
    }
    assertPaymentReady();
    if (result.session?.status === "open" && result.session.url) return NextResponse.redirect(result.session.url,303);
    if (result.session?.status !== "expired") throw new Error("review");
    // Both concurrent requests use the same key. Reopening never creates another registration.
    const session = await getStripe().checkout.sessions.create({
      mode:"payment",customer_email:r.email,
      line_items:[{quantity:1,price_data:{currency:"nzd",unit_amount:Number(r.entry_fee_cents),product_data:{name:`${t.title} - ${r.category_name || "General Entry"}`}}}],
      success_url:`${site}/payment/success?type=tournament&registration_id=${id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:`${site}/payment/cancel?type=tournament&registration_id=${id}`,
      metadata:{type:"tournament_registration",registration_id:id,tournament_id:r.tournament_id},
    },{idempotencyKey:`resume-tournament:${id}:${r.stripe_checkout_session_id}`});
    if (!session.url) throw new Error("review");
    const linked = await s.from("tournament_registrations").update({stripe_checkout_session_id:session.id,payment_status:"pending_payment",registration_status:"pending_payment",updated_at:new Date().toISOString()}).eq("id",id).eq("stripe_checkout_session_id",r.stripe_checkout_session_id).in("payment_status",["pending_payment","expired","failed"]).in("registration_status",["pending_payment","expired"]).select("id").maybeSingle();
    if (linked.error) { try { await getStripe().checkout.sessions.expire(session.id); } catch {} throw new Error("review"); }
    if (!linked.data) {
      const current = await s.from("tournament_registrations").select("*").eq("id",id).single();
      if (current.error || !unpaidEntry(current.data) || current.data.stripe_checkout_session_id !== session.id) {
        try { await getStripe().checkout.sessions.expire(session.id); } catch {}
        throw new Error("review");
      }
    }
    if (Date.now() >= paymentDeadline(t)) { try { await getStripe().checkout.sessions.expire(session.id); } catch {} throw new Error("closed"); }
    return NextResponse.redirect(session.url,303);
  } catch (e:any) {
    const code = ["settled","closed","membership","full"].includes(e.message) ? e.message : "review";
    return NextResponse.redirect(`${site}/payment/tournament-resume?token=${encodeURIComponent(token)}&notice=${code}`,303);
  }
}
