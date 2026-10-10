"use client";
import RegistrationEntryEditor from "./RegistrationEntryEditor";
import { useState } from "react";
import { Mail, Trash2 } from "lucide-react";
import RegistrationPaymentCheck from "./RegistrationPaymentCheck";
export default function RegistrationRowActions({id,email,initial,tournament}:{id:string;email:string;initial:Record<string,string>;tournament:string}) {
 const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");
 async function remove(){if(!confirm("Delete this unpaid registration? This cannot be undone."))return;setBusy(true);setMessage("");try{const res=await fetch("/api/admin/tournament-registrations",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({id})});const data=await res.json();if(!res.ok)throw new Error(data.error||"Delete failed.");window.location.reload();}catch(e:any){setMessage(e.message||"Unable to delete.");}finally{setBusy(false);}}
 return <div><div className="flex w-max flex-nowrap gap-0.5"><RegistrationEntryEditor id={id} initial={initial} tournament={tournament}/><a href={`mailto:${encodeURIComponent(email||"")}`} title="Compose email to player" aria-label="Compose email to player" className="inline-flex h-9 w-9 items-center justify-center bg-stone-500 text-white"><Mail size={16}/></a><RegistrationPaymentCheck id={id}/><button type="button" onClick={remove} disabled={busy} title="Delete unpaid registration" aria-label="Delete unpaid registration" className="inline-flex h-9 w-9 items-center justify-center bg-red-600 text-white disabled:opacity-50"><Trash2 size={16}/></button></div>{message&&<p role="status" className="mt-2 break-words text-xs text-red-700">{message}</p>}</div>;
}
