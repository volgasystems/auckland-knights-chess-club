import { notifyRegistrationReceived } from "@/lib/registrationNotification";
import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getStripe } from "@/lib/stripe";
import { assertPaymentReady, paymentConfiguration } from "@/lib/paymentConfig";
import { tryTournamentConfirmation } from "@/lib/tournamentPayment";

function getCategories(tournament: any) {
  return Array.isArray(tournament.category_options) ? tournament.category_options : [];
}
function normalizeCategoryKey(value: unknown) { return String(value || "").trim(); }
function today() { return new Intl.DateTimeFormat("en-CA", { timeZone: "Pacific/Auckland" }).format(new Date()); }
async function findActiveMembership(s: any, membershipId: string, email: string) {
  let query = s.from("club_memberships").select("*").in("payment_status", ["paid", "manual_paid", "waived"]).eq("membership_status", "active").gte("membership_end_date", today());
  if (membershipId) query = query.eq("membership_id", membershipId.toUpperCase());
  else query = query.ilike("email", email.replace(/[\\%_]/g, "\\$&"));
  const { data, error } = await query.order("membership_end_date", { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return data;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let savedRegistrationId = "";
  try {
    const { id } = await params;
    const body = await req.json();
    for (const field of ["first_name", "last_name", "email", "phone"]) {
      if (typeof body[field] !== "string" || !body[field].trim() || body[field].length > 254) return NextResponse.json({ error: "Enter your first name, last name, email and phone before registering." }, { status: 400 });
      body[field] = body[field].trim();
    }
    body.email = body.email.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) return NextResponse.json({ error: "Enter a valid email address for confirmation." }, { status: 400 });
    if (!body.consent) return NextResponse.json({ error: "Please confirm your registration details and communication consent." }, { status: 400 });
    const s = createSupabaseServiceClient();

    const { data: tournament, error: tournamentError } = await s.from("tournaments").select("*").eq("id", id).maybeSingle();
    if (tournamentError || !tournament) return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    if (tournament.status !== "open" || !tournament.allow_public_registration) return NextResponse.json({ error: "Registration is not open" }, { status: 400 });

    const { count, error: countError } = await s.from("tournament_registrations").select("id", { count: "exact", head: true }).eq("tournament_id", id).eq("payment_status", "paid").eq("registration_status", "confirmed");
    if (countError) throw countError;
    if (tournament.max_players && Number(count || 0) >= Number(tournament.max_players)) return NextResponse.json({ error: "Tournament has reached maximum players" }, { status: 400 });

    const isClubCalendar = tournament.tournament_type === "club_calendar";

    let membership: any = null;
    if (tournament.tournament_type !== "general_open") {
      if (!isClubCalendar) return NextResponse.json({ error: "This event needs its type configured by the club before registration." }, { status: 400 });
      const membershipId = String(body.membership_id || "").trim().toUpperCase();
      const membershipEmail = String(body.membership_email || body.email || "").trim().toLowerCase();
      membership = await findActiveMembership(s, membershipId, membershipEmail);
      if (!membership || !membership.membership_id) return NextResponse.json({ error: "Active membership is required for club events. Join or renew before registering." }, { status: 400 });
      if (String(membership.email).trim().toLowerCase() !== body.email || String(membership.first_name).trim().toLowerCase() !== body.first_name.toLowerCase() || String(membership.last_name).trim().toLowerCase() !== body.last_name.toLowerCase()) return NextResponse.json({ error: "The player name and email must match the active membership. Use the correct player membership ID or contact the club." }, { status: 400 });
    }

    const categoryOptions = getCategories(tournament);
    const requestedCategoryKey = normalizeCategoryKey(body.category_key);
    const selectedCategory = categoryOptions.length ? categoryOptions.find((category: any) => normalizeCategoryKey(category.key || category.name) === requestedCategoryKey) : null;
    if (categoryOptions.length && !selectedCategory) return NextResponse.json({ error: "Please select a valid tournament category" }, { status: 400 });

    const entryFeeCents = selectedCategory ? Number(selectedCategory.fee_cents || 0) : Number(tournament.entry_fee_cents || 0);
    const categoryName = selectedCategory ? selectedCategory.name : "General Entry";
    if (!Number.isSafeInteger(entryFeeCents) || entryFeeCents < 0) return NextResponse.json({ error: "Invalid tournament fee. Please contact the club." }, { status: 400 });

    const requiresPayment = true;
    if (requiresPayment && entryFeeCents <= 0) return NextResponse.json({ error: "This tournament requires payment, but no fee has been configured. Please contact the club." }, { status: 400 });

    if (requiresPayment) assertPaymentReady();

    const { data: registration, error } = await s.from("tournament_registrations").insert({
      tournament_id: id,
      membership_id: membership?.membership_id || null,
      is_member_registration: !!membership,
      membership_checked_at: membership ? new Date().toISOString() : null,
      first_name: body.first_name,
      last_name: body.last_name,
      email: body.email,
      phone: body.phone,
      date_of_birth: body.date_of_birth || null,
      nzcf_id: body.nzcf_id,
      nzcf_rating: body.nzcf_rating ? Number(body.nzcf_rating) : null,
      fide_id: body.fide_id,
      fide_rating: body.fide_rating ? Number(body.fide_rating) : null,
      club_name: body.club_name,
      school_name: body.school_name,
      parent_guardian_name: body.parent_guardian_name,
      parent_guardian_phone: body.parent_guardian_phone,
      street_address: body.street_address,
      suburb: body.suburb,
      city: body.city,
      postcode: body.postcode,
      category_key: selectedCategory ? normalizeCategoryKey(selectedCategory.key || selectedCategory.name) : "default",
      category_name: categoryName,
      category_fee_cents: entryFeeCents,
      category_prize_text: selectedCategory?.prize || selectedCategory?.prize_details || null,
      entry_fee_cents: entryFeeCents,
      payment_status: requiresPayment ? "pending_payment" : "paid",
      registration_status: requiresPayment ? "pending_payment" : "confirmed",
    }).select().single();
    if (error) throw error;

    savedRegistrationId = registration.id;
    const stripe = getStripe();
    const site = paymentConfiguration().siteUrl;
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: body.email,
      line_items: [{ quantity: 1, price_data: { currency: "nzd", unit_amount: entryFeeCents, product_data: { name: `${tournament.title} - ${categoryName}` } } }],
      success_url: `${site}/payment/success?type=tournament&registration_id=${registration.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/payment/cancel?type=tournament&registration_id=${registration.id}`,
      metadata: { type: "tournament_registration", registration_id: registration.id, tournament_id: id },
    });

    const { error: sessionSaveError } = await s.from("tournament_registrations").update({ stripe_checkout_session_id: session.id, updated_at: new Date().toISOString() }).eq("id", registration.id);
    if (sessionSaveError || !session.url) {
      try { await stripe.checkout.sessions.expire(session.id); } catch {}
      throw new Error("Checkout session could not be linked.");
    }
    const emailStatus = await notifyRegistrationReceived(s, registration, "tournament", tournament.title);
    return NextResponse.json({ email_status: emailStatus, url: session.url, registration_id: registration.id, payment_status: "pending_payment", registration_status: "pending_payment" });
  } catch (e: any) {
    console.error("Tournament registration failed", { registration_id: savedRegistrationId || null, error_code: e?.code || "registration_error" });
    return NextResponse.json({ error: savedRegistrationId
      ? `Your entry reference is ${savedRegistrationId}, but registration could not be completed. Do not pay again if a payment was taken. Contact info@aucklandknights.co.nz with this reference.`
      : "We could not complete your registration. Your entry is not confirmed. If payment was taken, do not pay again; contact info@aucklandknights.co.nz.", registration_id: savedRegistrationId || undefined }, { status: 503 });
  }
}
