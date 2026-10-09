import { NextResponse } from "next/server";
import { readMemberAccessToken, readMemberCheckoutToken } from "@/lib/membershipAccess";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getStripe } from "@/lib/stripe";
import { assertPaymentReady, paymentConfiguration } from "@/lib/paymentConfig";
export async function POST(req: Request) {
  let renewalId = ""; let sessionId = ""; let s: any;
  try {
    const body = await req.json(); const access = readMemberAccessToken(body.member_token); const checkoutAccess = readMemberCheckoutToken(body.member_token);
    if (!access && !checkoutAccess) return NextResponse.json({ error: "Your renewal session has expired or is invalid. Search for your membership again on Join Now." }, { status: 401 });
    if (!body.terms_accepted) return NextResponse.json({ error: "Accept the membership terms to continue." }, { status: 400 });
    s = createSupabaseServiceClient();
    const { data: member, error } = await s.from("club_memberships").select("*").eq("id", (access || checkoutAccess)!.id).single();
    if (error || !member || (access && member.email.toLowerCase() !== access.email) || !member.membership_id || member.membership_status === "cancelled" || !["paid","manual_paid","waived"].includes(member.payment_status)) return NextResponse.json({ error: "This membership requires club assistance before renewal." }, { status: 403 });
    const { data: option, error: optionError } = await s.from("membership_options").select("*").eq("key", body.option_key).eq("is_active", true).single();
    if (optionError || !option || !Number.isInteger(option.fee_cents) || option.fee_cents <= 0) return NextResponse.json({ error: "Select an available membership fee. Contact the club for free or waived renewals." }, { status: 400 });
    assertPaymentReady(); const stripe = getStripe();
    const { data: pending, error: pendingError } = await s.from("membership_renewals").select("*").eq("member_id", member.id).eq("status", "pending_payment").maybeSingle();
    if (pendingError) return NextResponse.json({ error: "Renewals need the database upgrade. Please contact the club; no payment was taken." }, { status: 503 });
    if (pending) {
      if (pending.stripe_checkout_session_id) {
        const existing = await stripe.checkout.sessions.retrieve(pending.stripe_checkout_session_id);
        if (existing.payment_status === "paid") return NextResponse.json({ error: "A renewal payment was already received. Please check its confirmation or contact the club; do not pay again." }, { status: 409 });
        if (existing.status === "open" && existing.url) return NextResponse.json({ url: existing.url, message: "Continuing your existing renewal checkout." });
        const { error: expireError } = await s.from("membership_renewals").update({ status: "expired" }).eq("id", pending.id).eq("status", "pending_payment"); if (expireError) throw expireError;
      } else return NextResponse.json({ error: "A renewal checkout is being prepared. Wait briefly or contact the club; do not submit again." }, { status: 409 });
    }
    const { data: renewal, error: createError } = await s.from("membership_renewals").insert({ member_id: member.id, option_key: option.key, option_name: option.name, amount_cents: option.fee_cents, validity_months: option.validity_months || 12, valid_until_month: option.valid_until_month || null }).select("*").single();
    if (createError) return NextResponse.json({ error: "A renewal is already pending or could not be saved. Please check before trying again. No payment was taken." }, { status: 409 });
    renewalId = renewal.id; const site = paymentConfiguration().siteUrl;
    const session = await stripe.checkout.sessions.create({ mode: "payment", customer_email: member.email, line_items: [{ quantity: 1, price_data: { currency: "nzd", unit_amount: option.fee_cents, product_data: { name: `${option.name} — membership renewal` } } }], success_url: `${site}/payment/success?type=membership&membership_id=${member.id}&session_id={CHECKOUT_SESSION_ID}`, cancel_url: `${site}/payment/cancel?type=membership&membership_id=${member.id}`, metadata: { type: "membership_renewal", membership_id: member.id, renewal_id: renewal.id } });
    sessionId = session.id;
    const { error: linkError } = await s.from("membership_renewals").update({ stripe_checkout_session_id: session.id }).eq("id", renewal.id);
    if (linkError || !session.url) throw new Error("Renewal checkout link failed");
    return NextResponse.json({ url: session.url });
  } catch {
    let safeToRetry = !sessionId;
    if (sessionId) { try { await getStripe().checkout.sessions.expire(sessionId); safeToRetry = true; } catch {} }
    if (renewalId && safeToRetry) await s.from("membership_renewals").update({ status: "failed" }).eq("id", renewalId).eq("status", "pending_payment");
    return NextResponse.json({ error: "Renewal could not be completed. If payment was taken, do not pay again. Contact the club with your payment reference." }, { status: 503 });
  }
}
