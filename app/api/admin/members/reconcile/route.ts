import { confirmMembershipRenewal } from "@/lib/membershipRenewal";
import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { canAccess } from "@/lib/roles";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getStripe } from "@/lib/stripe";
import { activateMembership, confirmMembershipPayment } from "@/lib/membershipPayment";
export async function POST(req: Request) {
  const admin = await getCurrentAdmin();
  if (!admin || !canAccess(admin.profile.role, "members")) return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  try {
    const { member_id } = await req.json(); const s = createSupabaseServiceClient();
    const { data: member, error } = await s.from("club_memberships").select("*").eq("id", member_id).single();
    if (error) throw error;
    const { data: renewals, error: renewalError } = await s.from("membership_renewals").select("*").eq("member_id", member_id).in("status", ["pending_payment","paid","failed","expired"]).order("created_at", { ascending: false }).limit(20);
    if (renewalError && !["PGRST205","42P01"].includes(renewalError.code)) throw renewalError;
    let renewalResult: any = null;
    for (const renewal of renewals || []) {
      if (!renewal.stripe_checkout_session_id) continue;
      const session = await getStripe().checkout.sessions.retrieve(renewal.stripe_checkout_session_id);
      if (session.payment_status === "paid" && session.status === "complete") {
        const result = await confirmMembershipRenewal(s, session);
        renewalResult ||= result;
        if (result.email_status !== "sent") return NextResponse.json(result);
      }
    }
    if (renewalResult) return NextResponse.json(renewalResult);
    if (["manual_paid", "waived"].includes(member.payment_status) || (member.payment_status === "paid" && !member.stripe_checkout_session_id)) {
      if (member.membership_status === "cancelled") throw new Error("Cancelled membership");
      return NextResponse.json(await activateMembership(s, member));
    }
    if (!member.stripe_checkout_session_id) return NextResponse.json({ error: "No Stripe checkout is linked. Verify payment before marking it paid." }, { status: 400 });
    const session = await getStripe().checkout.sessions.retrieve(member.stripe_checkout_session_id);
    if (session.payment_status !== "paid") return NextResponse.json({ error: "Stripe has not confirmed payment. No charge was created." }, { status: 400 });
    return NextResponse.json(await confirmMembershipPayment(s, session));
  } catch { return NextResponse.json({ error: "Membership could not be checked. Review payment, numbering and Email Diagnostics. No new charge was made." }, { status: 503 }); }
}
