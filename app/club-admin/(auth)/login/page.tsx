"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function AdminLoginPage(){
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(false);
  const router=useRouter();
  async function submit(e:React.FormEvent){
    e.preventDefault(); setLoading(true); setError("");
    const supabase=createSupabaseBrowserClient();
    const {error}=await supabase.auth.signInWithPassword({email,password});
    setLoading(false);
    if(error) return setError(error.message);
    router.push("/club-admin/dashboard"); router.refresh();
  }
  return <main className="grid min-h-screen place-items-center bg-akcc-pale p-4"><form onSubmit={submit} className="card w-full max-w-md p-8"><img src="/logo.png" alt="Auckland Knights" className="mx-auto h-24 w-24 rounded-full"/><h1 className="mt-5 text-center text-3xl font-extrabold">Club Admin Login</h1><p className="mt-2 text-center text-sm text-slate-600">Private access for authorised admin, super admin and content users only.</p><label className="mt-6 block"><span className="label">Email</span><input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="input mt-1" required/></label><label className="mt-4 block"><span className="label">Password</span><input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="input mt-1" required/></label>{error && <p className="mt-4 text-sm font-bold text-red-700">{error}</p>}<button disabled={loading} className="btn-primary mt-6 w-full">{loading?"Signing in...":"Sign in"}</button><div className="mt-5 text-center text-sm"><span className="text-slate-600">No credentials?</span> <Link href="/club-admin/signup" className="font-bold text-akcc-blue">Request admin access</Link></div><p className="mt-4 text-center text-xs text-slate-500">Sign-up creates a pending account only. Super Admin must approve and assign role access.</p></form></main>
}
