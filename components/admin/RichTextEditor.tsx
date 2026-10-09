"use client";
import { useRef, useState } from "react";
import MeetingSummary from "@/components/MeetingSummary";
import { formatSelection } from "@/lib/contentEditing";
export default function RichTextEditor({label,value,onChange,required,plain=false}:{label:string;value:string;onChange:(value:string)=>void;required?:boolean;plain?:boolean}) {
  const input=useRef<HTMLTextAreaElement>(null);
  const [preview,setPreview]=useState(false);
  function format(kind:string) {
    const el=input.current; if(!el)return;
    const result=formatSelection(value || "",el.selectionStart,el.selectionEnd,kind);
    onChange(result.value);
    requestAnimationFrame(()=>{el.focus();el.setSelectionRange(result.start,result.end);});
  }
  const controls=plain ? [["bullet","Bullet list"],["number","Numbered list"]] : [["bold","Bold"],["italic","Italic"],["heading","Heading"],["bullet","Bullet list"],["number","Numbered list"],["quote","Quote"],["link","Link"],["table","Table"]];
  return <div><span className="admin-label">{label}{required ? " *" : ""}</span><div className="mt-1 overflow-hidden rounded-lg border border-slate-300 bg-white"><div className="flex flex-wrap gap-1 border-b bg-stone-50 p-2">{controls.map(([kind,title])=><button key={kind} type="button" disabled={preview} onClick={()=>format(kind)} className="rounded border bg-white px-2 py-1 text-sm hover:bg-stone-100 disabled:opacity-40">{title}</button>)}<button type="button" onClick={()=>setPreview(!preview)} className="ml-auto rounded border bg-white px-3 py-1 text-sm font-bold">{preview ? "Edit text" : "Preview text"}</button></div><textarea ref={input} aria-label={label} value={value || ""} onChange={e=>onChange(e.target.value)} required={required} rows={10} className={`${preview ? "sr-only" : "block"} w-full resize-y p-4 text-sm leading-7 outline-none`} />{preview && <div className="min-h-40 p-4">{plain ? <div className="whitespace-pre-wrap break-words leading-7">{value}</div> : <MeetingSummary text={value}/>}</div>}</div></div>;
}
