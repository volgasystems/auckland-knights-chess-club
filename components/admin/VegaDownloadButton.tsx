"use client";

import { useState, type MouseEvent } from "react";

export default function VegaDownloadButton() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function download(event: MouseEvent<HTMLButtonElement>) {
    const form = event.currentTarget.form;
    if (!form || busy) return;
    const tournament = form.elements.namedItem("tournament_id");
    if (!(tournament instanceof HTMLSelectElement) || !tournament.value) {
      setMessage("Choose a tournament from the Tournament dropdown, then download the Vega CSV.");
      if (tournament instanceof HTMLSelectElement) tournament.focus();
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      const params = new URLSearchParams({type: "tournament_registrations", format: "vega", tournament_id: tournament.value});
      const response = await fetch(`/api/admin/export?${params}`);
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        setMessage(result?.error || "Could not download the Vega CSV. Refresh and try again.");
        return;
      }
      if (!response.headers.get("content-type")?.startsWith("text/csv")) {
        setMessage("Sign in again before downloading the Vega CSV.");
        return;
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = response.headers.get("content-disposition")?.match(/filename="([^"]+)"/)?.[1] || "vega-players.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setMessage("Could not download the Vega CSV. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="self-end">
    <button type="button" onClick={download} disabled={busy} className="btn-secondary py-2">
      {busy ? "Downloading..." : "Download Vega Player CSV"}
    </button>
    {message && <p role="alert" className="mt-2 text-sm text-red-700">{message}</p>}
  </div>;
}
