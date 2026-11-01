import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentAdmin } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getStripe } from "@/lib/stripe";
import { paymentConfiguration } from "@/lib/paymentConfig";
import { reconcileTournamentRefund } from "@/lib/tournamentRefund";

export async function POST(req:Request) {
 const admin=await getCurrentAdmin();
 if(!admin)return NextResponse.json({error:"Session expired. Please sign in again."},{status:401});
 if(!["admin","super_admin"].includes(admin.profile.role))return NextResponse.json({error:"Admin or Super Admin approval is required."},{status:403});
 try {
  const body=await req.json();
  const {id,action,reason,reference,refund,returned}=body;
  if(typeof id!=="string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id) || !["withdraw","request_refund","verify_stripe","complete_offline"].includes(action) || typeof reason!=="string" || reason.trim().length<5 || reason.length>1000 || (action==="withdraw" && typeof refund!=="boolean"))return NextResponse.json({error:"Select an action and enter a reason of 5-1000 characters."},{status:400});
  const s=createSupabaseServiceClient();
  // Verify schema before expiring any linked checkout or changing a record.
  const setup=await s.from("tournament_registrations").select("withdrawn_at,refund_status,refund_requested_cents").limit(1);
  if(setup.error)return NextResponse.json({error:"Run 20261102_tournament_withdrawals.sql in AKCC Supabase before using Withdraw / Refund."},{status:503});
  let {data:entry,error}=await s.from("tournament_registrations").select("*").eq("id",id).single();
  if(error || !entry)return NextResponse.json({error:"Registration not found."},{status:404});
  if(action==="complete_offline" && (returned!==true || typeof reference!=="string" || reference.trim().length<5 || reference.length>500))return NextResponse.json({error:"Enter the bank/cash refund reference and confirm the full fee has already been returned."},{status:400});
  if(action==="verify_stripe") {
   if(!entry.withdrawn_at || entry.refund_status!=="pending")return NextResponse.json({error:"No pending withdrawal refund to verify."},{status:409});
   if(!entry.stripe_checkout_session_id)return NextResponse.json({error:"No linked Stripe checkout. Use the verified offline refund process if this was a cash/bank payment."},{status:409});
   const session=await getStripe().checkout.sessions.retrieve(entry.stripe_checkout_session_id);
   const result=await reconcileTournamentRefund(s,session,entry);
   if(!result)return NextResponse.json({error:"Stripe has not confirmed a full refund. Pending or partial refunds do not complete this workflow. No refund was issued by this check."},{status:409});
   const refreshed=await s.from("tournament_registrations").select("*").eq("id",id).single();
   if(refreshed.error)throw refreshed.error;
   entry=refreshed.data;
   const audit=await s.rpc("manage_tournament_withdrawal",{p_registration_id:id,p_admin_id:admin.user.id,p_action:"complete_stripe",p_reason:reason.trim(),p_reference:result.stripe_charge_id || entry.stripe_payment_intent_id,p_refund:true,p_expected_updated_at:entry.updated_at});
   if(audit.error)throw audit.error;
   refresh();return NextResponse.json({ok:true,message:"Stripe full refund verified. Withdrawal completed; payment history retained."});
  }
  if(action==="withdraw" && !entry.withdrawn_at && entry.stripe_checkout_session_id) {
   const stripe=getStripe(),session=await stripe.checkout.sessions.retrieve(entry.stripe_checkout_session_id),config=paymentConfiguration();
   if(session.id!==entry.stripe_checkout_session_id || session.metadata?.type!=="tournament_registration" || session.metadata.registration_id!==entry.id || session.metadata.tournament_id!==entry.tournament_id || session.currency!=="nzd" || session.amount_total!==Number(entry.entry_fee_cents) || ((config.production || config.mode==="live")&&!session.livemode) || (config.mode==="test"&&session.livemode))throw new Error("Payment mismatch");
   if(session.status==="complete" && session.payment_status!=="paid")return NextResponse.json({error:"Stripe payment may be processing. Resolve it before withdrawing this entry."},{status:409});
   if(session.payment_status==="paid" && !["paid","refunded"].includes(entry.payment_status))return NextResponse.json({error:"Stripe shows payment received. Use Check payment first, then withdraw the confirmed entry."},{status:409});
   if(session.status==="open")await stripe.checkout.sessions.expire(session.id);
  }
  const result=await s.rpc("manage_tournament_withdrawal",{p_registration_id:id,p_admin_id:admin.user.id,p_action:action,p_reason:reason.trim(),p_reference:typeof reference==="string"?reference.trim():"",p_refund:refund===true,p_expected_updated_at:entry.updated_at});
  if(result.error)return NextResponse.json({error:["42883","PGRST202"].includes(result.error.code)?"Apply 20261102_tournament_withdrawals.sql in Supabase first.":"Entry changed or the refund cannot be recorded for this payment. Refresh and check the existing payment/refund."},{status:409});
  refresh();return NextResponse.json({ok:true,message:action==="complete_offline"?"Offline refund recorded. Payment history retained.":result.data.refund_status==="pending"?"Player withdrawn. Full-fee refund is pending; no money has been returned by this action.":"Player withdrawn. Registration and payment history retained."});
 }catch{return NextResponse.json({error:"Could not complete the action. Refresh and check Stripe or the bank record before retrying. This endpoint does not issue money transfers."},{status:503});}
}
function refresh(){for(const path of ["/club-admin/tournament-registrations","/club-admin/tournament-registrations/players","/club-admin/dashboard"])revalidatePath(path);revalidatePath("/tournaments","layout");}
