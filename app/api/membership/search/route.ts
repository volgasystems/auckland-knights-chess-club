import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { memberCheckoutToken } from "@/lib/membershipAccess";
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const membershipId = String(body.membership_id || "").trim().toUpperCase();
    const surname = String(body.surname || "").trim();
    if ((!email && !membershipId) || email.length > 254 || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) || membershipId.length > 64 || surname.length > 100) return NextResponse.json({ error: "Enter your membership ID or registered email. Surname is optional." }, { status: 400 });
    const literal = (v: string) => v.replace(/[\\%_]/g, "\\$&");
    let query = createSupabaseServiceClient().from("club_memberships").select("id,first_name,last_name,membership_id,payment_status,membership_status,membership_end_date,membership_options");
    if (email) query = query.ilike("email", literal(email));
    if (membershipId) query = query.ilike("membership_id", literal(membershipId));
    if (surname) query = query.ilike("last_name", literal(surname));
    const { data, error } = await query.limit(20); if (error) throw error;
    const members = (data || []).map((m: any) => ({ first_name: m.first_name, last_name: m.last_name, membership_id: m.membership_id || "Not assigned yet", payment_status: m.payment_status, membership_status: m.membership_status, membership_end_date: m.membership_end_date, option_key: Array.isArray(m.membership_options) ? m.membership_options[0]?.key : undefined, checkout_token: m.membership_id && ["paid", "manual_paid", "waived"].includes(m.payment_status) && m.membership_status !== "cancelled" ? memberCheckoutToken(m) : undefined, result_key: memberCheckoutToken(m) }));
    return NextResponse.json({ members, message: members.length ? "Membership found. Select the player to view their status." : "No matching member record found. Check your ID/email and surname, or contact the club." }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "Membership search is unavailable right now. Try again later or contact the club. No payment was taken." }, { status: 503 }); }
}
