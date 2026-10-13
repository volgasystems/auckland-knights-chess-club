import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE } from "@/lib/adminSession";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export async function POST(){ const supabase=await createSupabaseServerClient(); await supabase.auth.signOut(); (await cookies()).delete(ADMIN_SESSION_COOKIE); return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"), { status: 303 }); }
