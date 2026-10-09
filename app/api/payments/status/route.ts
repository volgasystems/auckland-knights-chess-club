import { NextResponse } from "next/server";
import { paymentConfiguration } from "@/lib/paymentConfig";
export const dynamic = "force-dynamic";
export async function GET() {
  const { mode, available } = paymentConfiguration();
  return NextResponse.json({ mode, available }, { headers: { "Cache-Control": "no-store" } });
}
