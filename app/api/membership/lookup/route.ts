import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

function today() {
  return new Date().toISOString().slice(0, 10);
}

export async function POST(req: Request) {
  try {
    const { membership_id, email } = await req.json();
    const membershipId = String(membership_id || "").trim().toUpperCase();
    const memberEmail = String(email || "").trim().toLowerCase();

    if (!membershipId && !memberEmail) {
      return NextResponse.json({ error: "Enter Membership ID or registered email address." }, { status: 400 });
    }

    if ((membershipId && !/^[A-Z0-9-]{2,30}$/.test(membershipId)) || (memberEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(memberEmail))) return NextResponse.json({ error: "Enter a valid membership ID or email." }, { status: 400 });
    const s = createSupabaseServiceClient();
    let query = s
      .from("club_memberships")
      .select("id,membership_id,first_name,last_name,email,phone,date_of_birth,nzcf_id,nzcf_rating,fide_id,fide_rating,school,parent_guardian_phone,parent_guardian_first_name,parent_guardian_last_name,street_address,suburb,city,postcode,membership_status,payment_status,membership_start_date,membership_end_date")
      .in("payment_status", ["paid", "manual_paid", "waived"])
      .eq("membership_status", "active")
      .gte("membership_end_date", today());

    if (membershipId) query = query.eq("membership_id", membershipId);
    else query = query.ilike("email", memberEmail.replace(/[\\%_]/g, "\\$&"));

    const { data, error } = await query
      .order("membership_end_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json(
        { error: "No active paid membership found. Please check the Membership ID/email or renew membership." },
        { status: 404 }
      );
    }

    return NextResponse.json({ member: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Membership lookup failed" }, { status: 500 });
  }
}
