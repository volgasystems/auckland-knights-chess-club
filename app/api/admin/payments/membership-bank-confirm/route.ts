import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentAdmin } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { activateMembership } from "@/lib/membershipPayment";
export async function POST(req:Request) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({error:"Session expired. Please sign in again."},{status:401});
  if (!["admin","super_admin"].includes(admin.profile.role)) return NextResponse.json({error:"Admin or Super Admin approval is required."},{status:403});
  try {
    const {registration_id,method,note,received}=await req.json();
    if (typeof registration_id !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(registration_id) || method!=="bank_transfer" || received!==true || typeof note!=="string" || note.trim().length<5 || note.length>500) return NextResponse.json({error:"Confirm receipt of the full bank transfer and enter its reference (5–500 characters)."},{status:400});
    const s=createSupabaseServiceClient();
    const {data:member,error}=await s.from("club_memberships").select("*").eq("id",registration_id).single();
    if(error || !member) return NextResponse.json({error:"Membership not found."},{status:404});
    if(member.payment_method!=="bank_transfer" || member.stripe_checkout_session_id || member.payment_status==="refunded" || member.membership_status==="cancelled") return NextResponse.json({error:"This is not a pending bank-transfer membership. Verify the existing payment instead."},{status:409});
    const result=await s.rpc("confirm_bank_membership_payment",{p_registration_id:member.id,p_admin_id:admin.user.id,p_note:note.trim(),p_expected_updated_at:member.updated_at});
    if(result.error) return NextResponse.json({error:["42883","PGRST202","42703"].includes(result.error.code) ? "Run 20261025_bank_transfer_registration.sql in Supabase to enable bank payment approval." : "Membership changed or a payment already exists. Refresh and verify before approving."},{status:409});
    const activation=await activateMembership(s,result.data);
    revalidatePath("/club-admin/members"); revalidatePath("/club-admin/dashboard");
    return NextResponse.json({...activation,message:"Bank payment recorded and membership activated."});
  } catch {return NextResponse.json({error:"Could not complete confirmation. Refresh the member record. If payment was recorded, retry confirmation to finish activation; do not record another payment."},{status:503});}
}
