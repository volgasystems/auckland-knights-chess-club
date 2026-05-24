import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { sendEmail } from "@/lib/email";

function endOfCurrentMembershipYear() {
  const now = new Date();
  const end = new Date(Date.UTC(now.getUTCFullYear(), 11, 31));
  return end.toISOString().slice(0, 10);
}
function todayISO() { return new Date().toISOString().slice(0, 10); }
function render(template: string, values: Record<string, any>) {
  return String(template || "").replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key) => String(values[key] ?? ""));
}

async function sendMembershipConfirmation(s: any, membership: any) {
  try {
    const { data: tmpl } = await s.from("email_templates").select("*").eq("template_key", "membership_confirmation").eq("is_active", true).maybeSingle();
    if (!tmpl) return;
    const values = {
      first_name: membership.first_name,
      last_name: membership.last_name,
      full_name: `${membership.first_name || ""} ${membership.last_name || ""}`.trim(),
      email: membership.email,
      membership_id: membership.membership_id,
      membership_start_date: membership.membership_start_date,
      membership_end_date: membership.membership_end_date,
      club_name: "Auckland Knights Chess Club",
    };
    await sendEmail({ to: membership.email, subject: render(tmpl.subject, values), html: `<pre style="font-family:Arial,sans-serif;white-space:pre-wrap">${render(tmpl.body, values)}</pre>` });
  } catch {}
}

export async function POST(req:Request){
  const stripe=getStripe();
  const sig=req.headers.get('stripe-signature');
  const secret=process.env.STRIPE_WEBHOOK_SECRET;
  if(!secret) return NextResponse.json({error:'STRIPE_WEBHOOK_SECRET missing'},{status:500});
  const raw=await req.text();
  let event;
  try{ event=stripe.webhooks.constructEvent(raw,sig!,secret); }catch(e:any){ return NextResponse.json({error:`Webhook signature failed: ${e.message}`},{status:400}); }
  const s=createSupabaseServiceClient();
  if(event.type==='checkout.session.completed'){
    const session=event.data.object as any;
    const type=session.metadata?.type;
    if(type==='membership'){
      const id=session.metadata?.membership_id;
      const { data: existing } = await s.from('club_memberships').select('*').eq('id', id).maybeSingle();
      let membershipId = existing?.membership_id;
      if (!membershipId) {
        const { data: generated } = await s.rpc('generate_membership_id');
        membershipId = generated || `AK${Math.floor(10000 + Math.random()*89999)}`;
      }
      const membership_start_date = existing?.membership_start_date || todayISO();
      const membership_end_date = existing?.membership_end_date || endOfCurrentMembershipYear();
      const { data: updated } = await s.from('club_memberships').update({
        payment_status:'paid',
        membership_status:'active',
        membership_id: membershipId,
        membership_start_date,
        membership_end_date,
        stripe_payment_intent_id:String(session.payment_intent||''),
        updated_at:new Date().toISOString()
      }).eq('id',id).select('*').maybeSingle();
      await s.from('payment_records').insert({payment_type:'membership',reference_id:id,email:session.customer_email,amount_cents:session.amount_total,status:'paid',stripe_checkout_session_id:session.id,stripe_payment_intent_id:String(session.payment_intent||'')});
      if (updated) await sendMembershipConfirmation(s, updated);
    }
    if(type==='tournament_registration'){
      const id=session.metadata?.registration_id;
      await s.from('tournament_registrations').update({payment_status:'paid',registration_status:'confirmed',stripe_payment_intent_id:String(session.payment_intent||''),updated_at:new Date().toISOString()}).eq('id',id);
      await s.from('payment_records').insert({payment_type:'tournament',reference_id:id,email:session.customer_email,amount_cents:session.amount_total,status:'paid',stripe_checkout_session_id:session.id,stripe_payment_intent_id:String(session.payment_intent||'')});
    }
  }
  if(event.type==='checkout.session.expired'){
    const session=event.data.object as any;
    if(session.metadata?.type==='membership') await s.from('club_memberships').update({payment_status:'expired',membership_status:'expired'}).eq('id',session.metadata.membership_id);
    if(session.metadata?.type==='tournament_registration') await s.from('tournament_registrations').update({payment_status:'expired',registration_status:'expired'}).eq('id',session.metadata.registration_id);
  }
  return NextResponse.json({received:true});
}
