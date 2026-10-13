"use client";
import { useEffect } from "react";
export default function AdminSessionExpiry({ expiresAt }: { expiresAt: number }) {
  useEffect(() => {
    let expired = false;
    const check = () => {
      if (expired || Date.now() < expiresAt) return;
      expired = true;
      window.location.replace("/club-admin/login?expired=1");
    };
    const timer = window.setTimeout(check, Math.max(0, expiresAt - Date.now()));
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    check();
    return () => { clearTimeout(timer); window.removeEventListener("focus", check); document.removeEventListener("visibilitychange", check); };
  }, [expiresAt]);
  return null;
}
