import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentAdmin } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { stopMembershipCheckouts } from "@/lib/membershipAdminPayment";
import { confirmMembershipPayment } from "@/lib/membershipPayment";
import { getStripe } from "@/lib/stripe";
import { validateMembershipCheckout } from "@/lib/membershipAdminPayment";
import { activateMembership } from "@/lib/membershipPayment";
export async function POST(req:Request) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({error:"Session expired. Please sign in again."},{status:401});
  if (!["admin","super_admin"].includes(admin.profile.role)) return NextResponse.json({error:"Admin or Super Admin approval is required."},{status:403});
  try {
    const {registration_id,method,note,received}=await req.json();
    if (typeof registration_id !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(registration_id) || !["cash","bank_transfer","verified_other"].includes(method) || received!==true || typeof note!=="string" || note.trim().length<5 || note.length>500) return NextResponse.json({error:"Confirm receipt of the full payment and enter its reference (5–500 characters)."},{status:400});
    const s=createSupabaseServiceClient();
    const {data:member,error}=await s.from("club_memberships").select("*").eq("id",registration_id).single();
    if(error || !member) return NextResponse.json({error:"Membership not found."},{status:404});
    if(member.payment_status==="refunded" || member.membership_status==="cancelled" || member.withdrawn_at) return NextResponse.json({error:"Cancelled or refunded memberships cannot be confirmed."},{status:409});
    const setup=await s.from("club_memberships").select("withdrawn_at").limit(1);
    if(setup.error)return NextResponse.json({error:"Apply 20261102_membership_payments_withdrawals.sql in Supabase first."},{status:503});
    const receipt=await s.from("payment_records").select("*").eq("id",member.id).maybeSingle();
    if(receipt.error)throw receipt.error;
    const replay=member.payment_status==="paid"&&receipt.data?.status==="paid"&&["cash","bank_transfer","verified_other"].includes(receipt.data?.payment_method);
    if(!replay&&member.stripe_checkout_session_id){
      const session=await getStripe().checkout.sessions.retrieve(member.stripe_checkout_session_id);validateMembershipCheckout(session,member);
      if(session.status==="complete"&&session.payment_status==="paid"){
        const intent=typeof session.payment_intent==="string"?session.payment_intent:session.payment_intent?.id;
        if(!intent)throw Error("Payment unavailable");
        const charges=await getStripe().charges.list({payment_intent:intent,limit:100});
        if(charges.data.some(c=>c.amount_refunded>0))return NextResponse.json({error:"Stripe shows a refund. Review the existing payment; manual approval was not applied."},{status:409});
        return NextResponse.json(await confirmMembershipPayment(s,session));
      }
      await stopMembershipCheckouts(s,member,false);
    }
    const result=await s.rpc("confirm_manual_membership_payment",{p_registration_id:member.id,p_admin_id:admin.user.id,p_method:method,p_note:note.trim(),p_expected_updated_at:member.updated_at});
    if(result.error) return NextResponse.json({error:["42883","PGRST202","42703"].includes(result.error.code) ? "Run 20261102_membership_payments_withdrawals.sql in Supabase to enable bank payment approval." : "Membership changed or a payment already exists. Refresh and verify before approving."},{status:409});
    const activation=await activateMembership(s,result.data);
    revalidatePath("/club-admin/members"); revalidatePath("/club-admin/dashboard");
    return NextResponse.json({...activation,message:"Payment recorded and membership activated."});
  } catch {return NextResponse.json({error:"Could not complete confirmation. Refresh the member record. If payment was recorded, retry confirmation to finish activation; do not record another payment."},{status:503});}
}
