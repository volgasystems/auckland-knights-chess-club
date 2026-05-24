import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getStripe } from "@/lib/stripe";
import { sendEmail } from "@/lib/email";

function getCategories(tournament: any) {
  return Array.isArray(tournament.category_options) ? tournament.category_options : [];
}
function normalizeCategoryKey(value: unknown) { return String(value || "").trim(); }
function today() { return new Date().toISOString().slice(0, 10); }
function render(template: string, values: Record<string, any>) { return String(template || "").replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, k) => String(values[k] ?? "")); }

async function findActiveMembership(s: any, membershipId: string, email: string) {
  let query = s.from("club_memberships").select("*").in("payment_status", ["paid", "manual_paid", "waived"]).eq("membership_status", "active").gte("membership_end_date", today());
  if (membershipId) query = query.eq("membership_id", membershipId.toUpperCase());
  else query = query.ilike("email", email);
  const { data, error } = await query.order("membership_end_date", { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return data;
}

async function sendCalendarConfirmation(s: any, registration: any, tournament: any, membership: any) {
  try {
    const { data: tmpl } = await s.from("email_templates").select("*").eq("template_key", "calendar_registration").eq("is_active", true).maybeSingle();
    if (!tmpl) return;
    const values = { first_name: registration.first_name, last_name: registration.last_name, email: registration.email, tournament_name: tournament.title, membership_id: membership.membership_id, club_name: "Auckland Knights Chess Club" };
    await sendEmail({ to: registration.email, subject: render(tmpl.subject, values), html: `<pre style="font-family:Arial,sans-serif;white-space:pre-wrap">${render(tmpl.body, values)}</pre>` });
  } catch {}
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const s = createSupabaseServiceClient();

    const { data: tournament, error: tournamentError } = await s.from("tournaments").select("*").eq("id", id).maybeSingle();
    if (tournamentError || !tournament) return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    if (tournament.status !== "open" || !tournament.allow_public_registration) return NextResponse.json({ error: "Registration is not open" }, { status: 400 });

    const { count } = await s.from("tournament_registrations").select("id", { count: "exact", head: true }).eq("tournament_id", id).eq("payment_status", "paid").eq("registration_status", "confirmed");
    if (tournament.max_players && Number(count || 0) >= Number(tournament.max_players)) return NextResponse.json({ error: "Tournament has reached maximum players" }, { status: 400 });

    const isClubCalendar = tournament.tournament_type === "club_calendar";

    if (isClubCalendar) {
      const membershipId = String(body.membership_id || "").trim().toUpperCase();
      const membershipEmail = String(body.membership_email || body.email || "").trim().toLowerCase();
      if (!membershipId && !membershipEmail) return NextResponse.json({ error: "Please enter membership ID or membership email." }, { status: 400 });
      const membership = await findActiveMembership(s, membershipId, membershipEmail);
      if (!membership) return NextResponse.json({ error: "Active paid membership was not found. Please join or renew membership before registering for this club calendar event." }, { status: 400 });
      if (membershipEmail && String(membership.email).toLowerCase() !== membershipEmail && !membershipId) return NextResponse.json({ error: "Membership email does not match an active membership." }, { status: 400 });

      const { data: registration, error } = await s.from("tournament_registrations").insert({
        tournament_id: id,
        first_name: body.first_name,
        last_name: body.last_name,
        email: body.email || membership.email,
        phone: body.phone,
        date_of_birth: body.date_of_birth || null,
        nzcf_id: body.nzcf_id,
        nzcf_rating: body.nzcf_rating ? Number(body.nzcf_rating) : null,
        fide_id: body.fide_id,
        fide_rating: body.fide_rating ? Number(body.fide_rating) : null,
        club_name: body.club_name || "Auckland Knights Chess Club",
        school_name: body.school_name,
        parent_guardian_name: body.parent_guardian_name,
        parent_guardian_phone: body.parent_guardian_phone,
        street_address: body.street_address,
        suburb: body.suburb,
        city: body.city,
        postcode: body.postcode,
        membership_id: membership.membership_id,
        is_member_registration: true,
        membership_checked_at: new Date().toISOString(),
        entry_fee_cents: 0,
        payment_status: "paid",
        registration_status: "confirmed",
      }).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      await sendCalendarConfirmation(s, registration, tournament, membership);
      return NextResponse.json({ ok: true, message: `Registration confirmed using membership ${membership.membership_id}. No payment is required for this club calendar event.` });
    }

    const categoryOptions = getCategories(tournament);
    const requestedCategoryKey = normalizeCategoryKey(body.category_key);
    const selectedCategory = categoryOptions.length ? categoryOptions.find((category: any) => normalizeCategoryKey(category.key || category.name) === requestedCategoryKey) : null;
    if (categoryOptions.length && !selectedCategory) return NextResponse.json({ error: "Please select a valid tournament category" }, { status: 400 });

    const entryFeeCents = selectedCategory ? Number(selectedCategory.fee_cents || 0) : Number(tournament.entry_fee_cents || 0);
    const categoryName = selectedCategory ? selectedCategory.name : "General Entry";
    if (Number.isNaN(entryFeeCents) || entryFeeCents < 0) return NextResponse.json({ error: "Invalid tournament fee. Please contact the club." }, { status: 400 });

    const requiresPayment = entryFeeCents > 0 || tournament.require_payment === true;
    if (requiresPayment && entryFeeCents <= 0) return NextResponse.json({ error: "This tournament requires payment, but no fee has been configured. Please contact the club." }, { status: 400 });

    const { data: registration, error } = await s.from("tournament_registrations").insert({
      tournament_id: id,
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
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    if (!requiresPayment) return NextResponse.json({ ok: true, message: "Registration confirmed. No payment is required for this event." });

    const stripe = getStripe();
    const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: body.email,
      line_items: [{ quantity: 1, price_data: { currency: "nzd", unit_amount: entryFeeCents, product_data: { name: `${tournament.title} - ${categoryName}` } } }],
      success_url: `${site}/payment/success?type=tournament&registration_id=${registration.id}`,
      cancel_url: `${site}/payment/cancel?type=tournament&registration_id=${registration.id}`,
      metadata: { type: "tournament_registration", registration_id: registration.id, tournament_id: id },
    });

    await s.from("tournament_registrations").update({ stripe_checkout_session_id: session.id, updated_at: new Date().toISOString() }).eq("id", registration.id);
    return NextResponse.json({ url: session.url, registration_id: registration.id, payment_status: "pending_payment", registration_status: "pending_payment" });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
