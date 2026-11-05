"use client";
import { useRef, useState } from "react";
import { X } from "lucide-react";
export default function PdfPreview({src,label="Preview PDF",liveForm=false}:{src:string;label?:string;liveForm?:boolean}) {
 const dialog = useRef<HTMLDialogElement>(null);
 const [open,setOpen] = useState(false);
 const [previewSrc,setPreviewSrc] = useState(src);
 function close(){dialog.current?.close();setOpen(false);}
 return <>
  <button type="button" onClick={e=>{
   const form=e.currentTarget.form;
   if(liveForm && form){
    const url=new URL(src,window.location.origin);
    url.search=new URLSearchParams(Array.from(new FormData(form),([key,value])=>[key,String(value)])).toString();
    url.searchParams.set("format","pdf");url.searchParams.set("preview","1");
    setPreviewSrc(url.pathname+url.search);
   }else setPreviewSrc(src);
   setOpen(true);dialog.current?.showModal();
  }} className="btn-secondary py-2">{label}</button>
  <dialog ref={dialog} aria-label="Report PDF preview" onClose={()=>setOpen(false)} onClick={e=>{if(e.target===dialog.current)close();}} className="fixed inset-0 m-auto h-[85vh] w-[94vw] max-w-6xl overflow-hidden rounded-xl border-0 bg-white p-0 shadow-2xl backdrop:bg-black/60">
   <div className="flex h-full flex-col"><div className="flex shrink-0 items-center justify-between gap-4 border-b p-4"><h2 className="text-lg font-bold">PDF Preview</h2><button type="button" onClick={close} className="inline-flex items-center gap-2 rounded-md border px-3 py-2" aria-label="Close PDF preview"><X size={18}/>Close</button></div>{open && <iframe src={previewSrc} title="Report PDF" className="min-h-0 w-full flex-1 border-0"/>}</div>
  </dialog>
 </>;
}
