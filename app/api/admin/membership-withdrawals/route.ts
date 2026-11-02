import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentAdmin } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getStripe } from "@/lib/stripe";
import { paymentConfiguration } from "@/lib/paymentConfig";
import { stopMembershipCheckouts,validateMembershipCheckout } from "@/lib/membershipAdminPayment";
import { isFullTournamentRefund } from "@/lib/tournamentRefund";
const uuid=(v:any)=>typeof v==="string"&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v);
async function allowed(){const a=await getCurrentAdmin();return a&&["admin","super_admin"].includes(a.profile.role)?a:null;}
export async function GET(req:Request){
 if(!await allowed())return NextResponse.json({error:"Admin access required."},{status:403});
 const id=new URL(req.url).searchParams.get("id");if(!uuid(id))return NextResponse.json({error:"Invalid membership."},{status:400});
 const s=createSupabaseServiceClient(),r=await s.from("payment_records").select("id,amount_cents,status,payment_method,created_at,stripe_checkout_session_id,stripe_payment_intent_id").eq("reference_id",id).eq("payment_type","membership").order("created_at",{ascending:false});
 if(r.error)return NextResponse.json({error:"Unable to load receipts."},{status:503});
 return NextResponse.json({receipts:(r.data||[]).map((x:any)=>({id:x.id,amount_cents:x.amount_cents,status:x.status,method:x.payment_method||"Stripe",created_at:x.created_at,stripe:!!(x.stripe_checkout_session_id||x.stripe_payment_intent_id)}))},{headers:{"Cache-Control":"no-store"}});
}
export async function POST(req:Request){
 const admin=await allowed();if(!admin)return NextResponse.json({error:"Admin or Super Admin required."},{status:403});
 try{
  const {id,action,reason,reference,refund,returned,receipt_id}=await req.json();
  if(!uuid(id)||!["withdraw","request_refund","verify_stripe","complete_offline"].includes(action)||typeof reason!=="string"||reason.trim().length<5||reason.length>1000||(action==="withdraw"&&typeof refund!=="boolean")||(receipt_id!=null&&!uuid(receipt_id)))return NextResponse.json({error:"Choose the membership/payment and enter a reason (5-1000 characters)."},{status:400});
  const s=createSupabaseServiceClient(),setup=await s.from("club_memberships").select("withdrawn_at,refund_payment_record_id").limit(1);
  if(setup.error)return NextResponse.json({error:"Apply 20261102_membership_payments_withdrawals.sql in AKCC Supabase first."},{status:503});
  const m=await s.from("club_memberships").select("*").eq("id",id).single();if(m.error||!m.data)return NextResponse.json({error:"Membership not found."},{status:404});
  const member=m.data;let receipt:any=null,ref=typeof reference==="string"?reference.trim():"";
  if(receipt_id){const r=await s.from("payment_records").select("*").eq("id",receipt_id).eq("reference_id",id).eq("payment_type","membership").single();if(r.error||!r.data)return NextResponse.json({error:"Receipt does not belong to this membership."},{status:409});receipt=r.data;}
  if(action==="complete_offline"&&(returned!==true||ref.length<5||ref.length>500))return NextResponse.json({error:"Confirm the full receipt amount has already been returned and enter the bank/cash refund reference."},{status:400});
  if(action==="verify_stripe"){
   if(!member.withdrawn_at||member.refund_status!=="pending"||member.refund_payment_record_id!==receipt?.id||receipt.status!=="paid")return NextResponse.json({error:"Select the pending refund receipt."},{status:409});
   let intent=receipt.stripe_payment_intent_id;
   if(receipt.stripe_checkout_session_id){const session=await getStripe().checkout.sessions.retrieve(receipt.stripe_checkout_session_id);validateMembershipCheckout(session,member,receipt);intent=typeof session.payment_intent==="string"?session.payment_intent:session.payment_intent?.id;}
   if(!intent)return NextResponse.json({error:"No linked Stripe payment; use the verified offline process."},{status:409});
   if(receipt.stripe_payment_intent_id&&receipt.stripe_payment_intent_id!==intent)throw Error("Intent mismatch");
   const charges=await getStripe().charges.list({payment_intent:intent,limit:100}),config=paymentConfiguration();
   const charge=charges.data.find(isFullTournamentRefund);
   if(!charge)return NextResponse.json({error:"Stripe has not confirmed a full refund. Partial/pending refunds remain pending. No money was returned by this check."},{status:409});
   const pi=typeof charge.payment_intent==="string"?charge.payment_intent:charge.payment_intent?.id;
   if(pi!==intent||charge.currency!=="nzd"||charge.amount!==Number(receipt.amount_cents)||((config.production||config.mode==="live")&&!charge.livemode)||(config.mode==="test"&&charge.livemode))throw Error("Refund mismatch");
   ref=charge.id;
  }
  if(action==="withdraw"&&!member.withdrawn_at)await stopMembershipCheckouts(s,member,true);
  const r=await s.rpc("manage_membership_withdrawal",{p_registration_id:id,p_admin_id:admin.user.id,p_action:action==="verify_stripe"?"complete_stripe":action,p_reason:reason.trim(),p_reference:ref,p_refund:refund===true,p_receipt_id:receipt?.id||null,p_expected_updated_at:member.updated_at});
  if(r.error)return NextResponse.json({error:["42883","PGRST202"].includes(r.error.code)?"Apply 20261102_membership_payments_withdrawals.sql first.":"Membership/payment changed or this refund is not eligible. Refresh before retrying."},{status:409});
  revalidatePath("/club-admin/members");revalidatePath("/club-admin/dashboard");
  return NextResponse.json({ok:true,message:["verify_stripe","complete_offline"].includes(action)?"Refund verified/recorded. Membership remains withdrawn; history and ID retained.":r.data.refund_status==="pending"?"Membership withdrawn. Selected receipt refund pending; no money has been returned by this action.":"Membership withdrawn. History and membership ID retained."});
 }catch(e:any){return NextResponse.json({error:e?.message?.startsWith("Stripe")?e.message:"Could not complete action. Refresh and review payments/renewals before retrying. No refund is issued by this endpoint."},{status:503});}
}
