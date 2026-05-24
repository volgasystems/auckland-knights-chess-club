"use client";
import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

export default function MobilePublicNav({ links }: { links: [string, string][] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Open menu"
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-stone-300 bg-white text-black"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 border-t border-stone-200 bg-white p-4 shadow-soft">
          <div className="grid gap-2">
            {links.map(([href, label]) => (
              <Link key={href} href={href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-3 text-base font-extrabold text-stone-800 hover:bg-stone-100">
                {label}
              </Link>
            ))}
            <Link href="/join" onClick={() => setOpen(false)} className="btn-gold mt-2 w-full">Join Now</Link>
          </div>
        </div>
      )}
    </div>
  );
}
