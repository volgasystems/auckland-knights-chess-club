import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { bankTransferAccount } from "@/lib/bankTransfer";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  try {
    const u = new URL(req.url), kind = u.searchParams.get("type");
    if (kind !== "membership" && kind !== "tournament") return NextResponse.json({available:false}, {status:400});
    const s = createSupabaseServiceClient();
    let tournament;
    if (kind === "tournament") {
      const {data,error} = await s.from("tournaments").select("id,payment_account_id,status,allow_public_registration").eq("id",u.searchParams.get("tournament_id") || "").maybeSingle();
      if (error || !data || data.status !== "open" || !data.allow_public_registration) return NextResponse.json({available:false});
      tournament = data;
    }
    const account = await bankTransferAccount(s,kind,tournament);
    return NextResponse.json({available:!!account, account: account ? {name:account.name,account_number:account.account_number} : null}, {headers:{"Cache-Control":"no-store"}});
  } catch { return NextResponse.json({available:false}, {status:503}); }
}
