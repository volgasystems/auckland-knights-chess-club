"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function CleanTrackingUrl() {
  const pathname = usePathname();
  useEffect(() => {
    const url = new URL(window.location.href);
    let changed = false;
    for (const key of Array.from(url.searchParams.keys())) {
      if (key.toLowerCase().startsWith("utm_")) {
        url.searchParams.delete(key);
        changed = true;
      }
    }
    if (changed) {
      window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    }
  }, [pathname]);
  return null;
}
