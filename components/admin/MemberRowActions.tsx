"use client";
import { Mail, Pencil, Save, Trash2 } from "lucide-react";
import MemberPaymentCheck from "./MemberPaymentCheck";
export default function MemberRowActions({id,email,canEdit,editing,deleteAction}:{id:string;email:string;canEdit:boolean;editing:boolean;deleteAction:(data:FormData)=>Promise<void>}) {
 const editUrl = `/club-admin/members?search=${encodeURIComponent(email)}#member-maintenance`;
 const iconClass = "inline-flex h-9 w-9 items-center justify-center text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";
 return <div className="flex items-start gap-0.5">
  {canEdit && <a href={editUrl} title="Update member details" aria-label="Update member details" className={`${iconClass} bg-stone-900`}><Pencil size={16}/></a>}
  <a href={`mailto:${encodeURIComponent(email)}`} title="Compose email to member" aria-label="Compose email to member" className={`${iconClass} bg-stone-500`}><Mail size={16}/></a>
  <MemberPaymentCheck id={id}/>
  {canEdit && (editing ? <button type="submit" form={`member-${id}`} title="Save member changes" aria-label="Save member changes" className={`${iconClass} bg-stone-600`}><Save size={16}/></button> : <a href={editUrl} title="Open member details to save changes" aria-label="Open member details to save changes" className={`${iconClass} bg-stone-600`}><Save size={16}/></a>)}
  {canEdit && <form action={deleteAction} onSubmit={e=>{if(!window.confirm("Delete this member permanently? This cannot be undone."))e.preventDefault();}}><input type="hidden" name="id" value={id}/><button type="submit" title="Delete member" aria-label="Delete member" className={`${iconClass} bg-red-600`}><Trash2 size={16}/></button></form>}
 </div>;
}
