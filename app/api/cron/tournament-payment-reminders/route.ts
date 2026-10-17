import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { runPaymentReminders } from "@/lib/tournamentPaymentReminder";
export const maxDuration = 300;
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get("authorization") || "";
  const expected = `Bearer ${secret || ""}`;
  if (!secret || secret.length < 32 || Buffer.byteLength(header) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(header), Buffer.from(expected))) return NextResponse.json({error:"Not authorised"},{status:401});
  try { return NextResponse.json(await runPaymentReminders(createSupabaseServiceClient()), {headers:{"Cache-Control":"no-store"}}); }
  catch { return NextResponse.json({error:"Reminder processing unavailable. Apply the payment reminder SQL migration and check Email Diagnostics."},{status:503}); }
}
