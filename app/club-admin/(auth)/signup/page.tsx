"use client";
import Link from "next/link";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function AdminSignupPage(){
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(false);
  async function submit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault(); setLoading(true); setError(""); setMessage("");
    const form=new FormData(e.currentTarget);
    const first_name=String(form.get('first_name')||'');
    const last_name=String(form.get('last_name')||'');
    const email=String(form.get('email')||'');
    const password=String(form.get('password')||'');
    const supabase=createSupabaseBrowserClient();
    const {error}=await supabase.auth.signUp({email,password,options:{data:{first_name,last_name,full_name:`${first_name} ${last_name}`.trim()}}});
    setLoading(false);
    if(error) return setError(error.message);
    setMessage("Your access request has been created. Please ask Super Admin to approve and assign your role.");
  }
  return <main className="grid min-h-screen place-items-center bg-akcc-pale p-4"><form onSubmit={submit} className="card w-full max-w-lg p-8"><img src="/logo.png" alt="Auckland Knights" className="mx-auto h-24 w-24 rounded-full"/><h1 className="mt-5 text-center text-3xl font-extrabold">Request Admin Access</h1><p className="mt-2 text-center text-sm text-slate-600">This is for committee/admin users only. Public club members should use the Join page.</p><div className="mt-6 grid gap-4 md:grid-cols-2"><label><span className="label">First name</span><input name="first_name" className="input mt-1" required /></label><label><span className="label">Last name</span><input name="last_name" className="input mt-1" required /></label><label className="md:col-span-2"><span className="label">Email</span><input name="email" type="email" className="input mt-1" required /></label><label className="md:col-span-2"><span className="label">Password</span><input name="password" type="password" minLength={8} className="input mt-1" required /></label></div>{error && <p className="mt-4 text-sm font-bold text-red-700">{error}</p>}{message && <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm font-bold text-green-700">{message}</p>}<button disabled={loading} className="btn-primary mt-6 w-full">{loading ? "Submitting..." : "Create pending access request"}</button><Link href="/club-admin/login" className="mt-4 block text-center text-sm font-bold text-akcc-blue">Back to login</Link></form></main>
}
