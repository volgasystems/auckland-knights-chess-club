import { validDateOfBirth } from "@/lib/registrationValidation";
import { notifyRegistrationReceived } from "@/lib/registrationNotification";
import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getStripe } from "@/lib/stripe";
import { assertPaymentReady, paymentConfiguration } from "@/lib/paymentConfig";

export async function POST(req: Request) {
  let savedMembershipId = "";
  try {
    const body = await req.json();
    if (!validDateOfBirth(body.date_of_birth)) return NextResponse.json({ error: "Enter a valid date of birth. Date of birth is required and cannot be in the future." }, { status: 400 });
    for (const field of ["first_name", "last_name", "email", "phone"]) {
      if (typeof body[field] !== "string" || !body[field].trim()) return NextResponse.json({ error: "Enter the required player name, email and phone." }, { status: 400 });
      body[field] = body[field].trim();
    }
    body.email = body.email.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email) || !body.terms_accepted) return NextResponse.json({ error: "Enter a valid email and accept the membership terms." }, { status: 400 });
    const s = createSupabaseServiceClient();

    const { data: dbOptions, error: optErr } = await s
      .from("membership_options")
      .select("*")
      .eq("is_active", true);

    if (optErr) {
      return NextResponse.json({ error: optErr.message }, { status: 400 });
    }

    const priceMap = new Map(
      (dbOptions || []).map((option: any) => [
        option.key,
        { name: option.name, cents: Number(option.fee_cents || 0) },
      ])
    );

    const selected = (body.items || [])
      .map((item: any) => ({ key: item.key, quantity: Number(item.quantity || 0) }))
      .filter((item: any) => Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 10 && priceMap.has(item.key));

    if (!selected.length) {
      return NextResponse.json({ error: "Select at least one membership option" }, { status: 400 });
    }

    const items = selected.map((item: any) => {
      const price: any = priceMap.get(item.key);
      return {
        key: item.key,
        name: price.name,
        quantity: item.quantity,
        cents: price.cents,
        total_cents: price.cents * item.quantity,
      };
    });

    const total = items.reduce((sum: number, item: any) => sum + item.total_cents, 0);

    if (total <= 0) {
      return NextResponse.json(
        { error: "Membership payment amount must be greater than $0. Please check membership fees in Admin → Membership Options." },
        { status: 400 }
      );
    }

    assertPaymentReady();
    const { data: record, error } = await s
      .from("club_memberships")
      .insert({
        first_name: body.first_name,
        last_name: body.last_name,
        email: body.email,
        phone: body.phone,
        date_of_birth: body.date_of_birth,
        gender: body.gender,
        street_address: body.street_address,
        suburb: body.suburb,
        city: body.city,
        postcode: body.postcode,
        nzcf_id: body.nzcf_id,
        nzcf_rating: body.nzcf_rating ? Number(body.nzcf_rating) : null,
        fide_id: body.fide_id,
        fide_rating: body.fide_rating ? Number(body.fide_rating) : null,
        parent_guardian_phone: body.parent_guardian_phone,
        parent_guardian_first_name: body.parent_guardian_first_name,
        parent_guardian_last_name: body.parent_guardian_last_name,
        school: body.school,
        date_payment_made: body.date_payment_made || null,
        membership_options: items,
        total_amount_cents: total,
        payment_status: "pending_payment",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    savedMembershipId = record.id;
    const stripe = getStripe();
    const site = paymentConfiguration().siteUrl;
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: body.email,
      line_items: items.map((item: any) => ({
        quantity: item.quantity,
        price_data: {
          currency: "nzd",
          unit_amount: item.cents,
          product_data: { name: item.name },
        },
      })),
      success_url: `${site}/payment/success?type=membership&membership_id=${record.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/payment/cancel?type=membership&membership_id=${record.id}`,
      metadata: { type: "membership", membership_id: record.id },
    });

    const { error: sessionError } = await s.from("club_memberships").update({ stripe_checkout_session_id: session.id, updated_at: new Date().toISOString() }).eq("id", record.id);
    if (sessionError || !session.url) { try { await stripe.checkout.sessions.expire(session.id); } catch {} throw new Error("Checkout link could not be saved"); }

    const emailStatus = await notifyRegistrationReceived(s, record, "membership");
    return NextResponse.json({
      email_status: emailStatus,
      url: session.url,
      membership_id: record.id,
      payment_status: "pending_payment",
    });
  } catch (e: any) {
    return NextResponse.json({ error: `Membership could not be completed.${savedMembershipId ? ` Reference: ${savedMembershipId}.` : ""} If payment was taken, do not pay again. Contact info@aucklandknights.co.nz.`, membership_id: savedMembershipId || undefined }, { status: 503 });
  }
}
