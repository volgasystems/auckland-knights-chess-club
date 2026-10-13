"use client";
import { useEffect } from "react";
export default function AdminSessionExpiry({ remainingMs }: { remainingMs: number }) {
  useEffect(() => {
    const originalFetch = window.fetch.bind(window);
    let stopped = false, busy = false, timer: number;
    let lastRenewed = performance.now();
    const expire = () => { if (!stopped) window.location.replace("/club-admin/login?expired=1"); };
    const schedule = (ms: number) => { window.clearTimeout(timer); timer = window.setTimeout(() => void check(false), Math.max(100, ms)); };
    async function check(renew: boolean) {
      if (busy || stopped) return;
      busy = true;
      try {
        const res = await originalFetch("/api/admin/session", renew ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ renew: true }), cache: "no-store" } : { cache: "no-store" });
        if (res.status === 401) { expire(); return; }
        if (res.ok) {
          const data = await res.json();
          if (typeof data.remainingMs === "number") schedule(data.remainingMs);
          if (renew) lastRenewed = performance.now();
        } else schedule(15000);
      } catch { schedule(15000); }
      finally { busy = false; }
    }
    const activity = () => { if (performance.now() - lastRenewed >= 60000) void check(true); };
    const focus = () => { if (document.visibilityState === "visible") void check(false); };
    // A full navigation after login and expiry avoids stale protected router state.
    // Server-provided durations also avoid logging out due to a wrong device clock.
    schedule(remainingMs);
    const interval = window.setInterval(() => { if (document.visibilityState === "visible") void check(false); }, 60000);
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      const input = args[0];
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (/\/api\/admin\//.test(url) && (response.status === 401 || response.status === 403)) void check(false);
      return response;
    };
    for (const name of ["pointerdown", "keydown", "wheel", "touchstart"]) window.addEventListener(name, activity, { passive: true });
    window.addEventListener("focus", focus);
    document.addEventListener("visibilitychange", focus);
    return () => {
      stopped = true; window.clearTimeout(timer); window.clearInterval(interval); window.fetch = originalFetch;
      for (const name of ["pointerdown", "keydown", "wheel", "touchstart"]) window.removeEventListener(name, activity);
      window.removeEventListener("focus", focus); document.removeEventListener("visibilitychange", focus);
    };
  }, [remainingMs]);
  return null;
}
