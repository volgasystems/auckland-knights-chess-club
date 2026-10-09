import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { confirmTournamentPayment } from "@/lib/tournamentPayment";
import { confirmMembershipPayment } from "@/lib/membershipPayment";
import { paymentConfiguration } from "@/lib/paymentConfig";

export async function POST(req: Request) {
  try {
    const { session_id } = await req.json();
    if (typeof session_id !== "string" || !/^cs_(live|test)_[a-zA-Z0-9]+$/.test(session_id)) return NextResponse.json({ error: "Payment reference missing or invalid. Contact the club if you have paid; do not pay again." }, { status: 400 });
    const session = await getStripe().checkout.sessions.retrieve(session_id);
    if (paymentConfiguration().production && !session.livemode) return NextResponse.json({ status: "test_payment", message: "This was a test payment. It does not confirm a paid tournament entry. Contact the club." });
    if (session.payment_status !== "paid" || session.status !== "complete") return NextResponse.json({ status: session.status === "expired" ? "expired" : "pending", message: "Payment is not confirmed yet. If your bank shows a payment, do not pay again. Check again or contact info@aucklandknights.co.nz." });
    const s = createSupabaseServiceClient();
    if (session.metadata?.type === "tournament_registration") return NextResponse.json(await confirmTournamentPayment(s, session));
    if (session.metadata?.type === "membership") return NextResponse.json(await confirmMembershipPayment(s, session));

    return NextResponse.json({ error: "This payment cannot be linked to an entry. Contact the club; do not pay again." }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "We could not verify your registration right now. If payment was taken, do not pay again. Contact info@aucklandknights.co.nz with your payment reference." }, { status: 503 });
  }
}
