"use client";
import { useEffect } from "react";
export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    void fetch("/api/admin/session", { cache: "no-store" }).then(res => {
      if (res.status === 401) window.location.replace("/club-admin/login?expired=1");
    }).catch(() => {});
  }, []);
  return <div className="card mx-auto max-w-lg p-6"><h1 className="text-2xl font-extrabold">Unable to load this admin page</h1><p className="mt-3">Try again, or sign in again if your session has expired.</p><div className="mt-5 flex gap-3"><button className="btn-primary" onClick={reset}>Try again</button><a className="btn-secondary" href="/club-admin/login">Sign in again</a></div></div>;
}
