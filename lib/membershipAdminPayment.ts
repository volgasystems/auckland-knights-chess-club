import { getStripe } from "@/lib/stripe";
import { paymentConfiguration } from "@/lib/paymentConfig";
export function validateMembershipCheckout(session:any,member:any,receipt?:any){
 const config=paymentConfiguration(),renewal=receipt&&session.metadata?.type==="membership_renewal";
 if(session.mode!=="payment" || session.id!==(receipt?.stripe_checkout_session_id||member.stripe_checkout_session_id) || session.metadata?.membership_id!==member.id || session.metadata?.type!==(renewal?"membership_renewal":"membership") || (renewal&&session.metadata.renewal_id!==receipt.id) || session.currency!=="nzd" || session.amount_total!==Number(receipt?.amount_cents??member.total_amount_cents) || ((config.production||config.mode==="live")&&!session.livemode) || (config.mode==="test"&&session.livemode))throw Error("Stripe payment mismatch");
}
export async function stopMembershipCheckouts(s:any,member:any,withdrawing:boolean){
 async function stop(id:string,receipt?:any){
  const stripe=getStripe();
  const session=await stripe.checkout.sessions.retrieve(id);validateMembershipCheckout(session,member,receipt);
  if(session.payment_status==="paid"){
   if(!withdrawing || (!receipt&&!["paid","manual_paid","refunded"].includes(member.payment_status)) || (receipt&&!['paid','refunded'].includes(receipt.status)))throw Error("Stripe shows payment. Use Check payment before this action.");
  }else if(session.status==="complete"||session.payment_status!=="unpaid")throw Error("Stripe payment is processing. Review it first.");
  else if(session.status==="open")await stripe.checkout.sessions.expire(id);
 }
 if(member.stripe_checkout_session_id)await stop(member.stripe_checkout_session_id);
 if(withdrawing){
  const renewals=await s.from("membership_renewals").select("*").eq("member_id",member.id).in("status",["pending_payment","failed","expired"]);
  if(renewals.error&&!['PGRST205','42P01'].includes(renewals.error.code))throw renewals.error;
  for(const r of renewals.data||[])if(r.stripe_checkout_session_id)await stop(r.stripe_checkout_session_id,{...r,amount_cents:r.amount_cents});
 }
}
