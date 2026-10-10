import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentAdmin } from "@/lib/auth";
import { canAccess } from "@/lib/roles";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getStripe } from "@/lib/stripe";
export async function DELETE(req: Request) {
  const admin = await getCurrentAdmin();
  if (!admin || !canAccess(admin.profile.role, "tournament_registrations")) return NextResponse.json({error:"Not authorised"},{status:403});
  try {
    const {id} = await req.json();
    if (typeof id !== "string" || !id.trim()) return NextResponse.json({error:"Select a registration."},{status:400});
    const s = createSupabaseServiceClient();
    const {data:entry,error} = await s.from("tournament_registrations").select("*").eq("id",id).single();
    if (error || !entry) return NextResponse.json({error:"Registration not found."},{status:404});
    if (["paid","manual_paid","refunded"].includes(entry.payment_status)) return NextResponse.json({error:"Paid or refunded registrations must be retained for payment records. Contact the club administrator to cancel the entry."},{status:409});
    if (entry.stripe_checkout_session_id) {
      const stripe = getStripe();
      const session = await stripe.checkout.sessions.retrieve(entry.stripe_checkout_session_id);
      if (session.payment_status === "paid" || session.status === "complete") return NextResponse.json({error:"Stripe has completed this checkout. Verify the payment before making changes."},{status:409});
      if (session.status === "open") await stripe.checkout.sessions.expire(session.id);
    }
    const {data:removed,error:removeError} = await s.from("tournament_registrations").delete().eq("id",id).eq("payment_status",entry.payment_status).select("id");
    if (removeError) return NextResponse.json({error:"This registration could not be deleted. It may have related records."},{status:400});
    if (!removed?.length) return NextResponse.json({error:"Registration changed. Refresh before trying again."},{status:409});
    revalidatePath("/club-admin/tournament-registrations");
    return NextResponse.json({ok:true});
  } catch { return NextResponse.json({error:"Unable to delete. Check the registration and linked Stripe checkout, then try again."},{status:400}); }
}
