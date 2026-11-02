"use client";
import MembershipWithdrawal from "./MembershipWithdrawal";
import RegistrationManualConfirm from "./RegistrationManualConfirm";
import { useState } from "react";
import { Mail, Pencil, Trash2 } from "lucide-react";
import MemberPaymentCheck from "./MemberPaymentCheck";
export default function MemberRowActions({id,email,canEdit,editing,deleteAction,canConfirm=false,fee=0,player="",canWithdraw=false,withdrawn=false,refundStatus="",refundReceipt="",canDelete=false}:{canWithdraw?:boolean;withdrawn?:boolean;refundStatus?:string;refundReceipt?:string;canDelete?:boolean;canConfirm?:boolean;fee?:number;player?:string;id:string;email:string;canEdit:boolean;editing:boolean;deleteAction:(data:FormData)=>Promise<void>}) {
 const [message,setMessage] = useState("");
 const editUrl = `/club-admin/members?search=${encodeURIComponent(email)}#member-maintenance`;
 const iconClass = "inline-flex h-9 w-9 shrink-0 items-center justify-center text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";
 return <div className="w-full"><div className="flex flex-wrap items-center gap-1">
  {canEdit && <a href={editUrl} title="Update member details" aria-label="Update member details" className={`${iconClass} bg-stone-900`}><Pencil size={16}/></a>}
  <a href={`mailto:${encodeURIComponent(email)}`} title="Compose email to member" aria-label="Compose email to member" className={`${iconClass} bg-stone-500`}><Mail size={16}/></a>
  {canConfirm && <RegistrationManualConfirm kind="membership" id={id} player={player} tournament="Annual club membership" fee={fee} onMessage={setMessage}/>}
  <MemberPaymentCheck id={id} onResult={setMessage}/>
  {canWithdraw&&<MembershipWithdrawal id={id} player={player} withdrawn={withdrawn} refundStatus={refundStatus} refundReceipt={refundReceipt} onMessage={setMessage}/>}
  {canEdit && canDelete && <form action={deleteAction} onSubmit={e=>{if(!window.confirm("Delete this member permanently? This cannot be undone."))e.preventDefault();}}><input type="hidden" name="id" value={id}/><button type="submit" title="Delete member" aria-label="Delete member" className={`${iconClass} bg-red-600`}><Trash2 size={16}/></button></form>}
 </div>{message && <p role="status" className="mt-2 whitespace-normal break-words text-xs leading-5 text-stone-600">{message}</p>}</div>;
}
