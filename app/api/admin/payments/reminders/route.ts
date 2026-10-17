import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { runPaymentReminders } from "@/lib/tournamentPaymentReminder";
export const maxDuration = 300;
export async function POST(req: Request) {
  const admin = await getCurrentAdmin();
  if (!admin || !["admin","super_admin"].includes(admin.profile.role)) return NextResponse.json({error:"Not authorised"},{status:403});
  const body = await req.json().catch(()=>({}));
  if (body.send_due !== true) return NextResponse.json({error:"Confirm sending due reminders."},{status:400});
  if (body.tournament_id && !/^[0-9a-f-]{36}$/i.test(body.tournament_id)) return NextResponse.json({error:"Invalid tournament."},{status:400});
  try { return NextResponse.json(await runPaymentReminders(createSupabaseServiceClient(),body.tournament_id || undefined)); }
  catch { return NextResponse.json({error:"Reminders are unavailable. Run the payment reminder SQL migration and check Email Diagnostics."},{status:503}); }
}
