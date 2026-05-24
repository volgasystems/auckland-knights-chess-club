"use client";
import { useEffect, useRef, useState } from "react";

type AddressResult = {
  display: string;
  street_address: string;
  suburb: string;
  city: string;
  postcode: string;
};

export default function AddressAutocomplete({
  onSelect,
}: {
  onSelect: (value: {
    street_address: string;
    suburb: string;
    city: string;
    postcode: string;
    display: string;
  }) => void;
}) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AddressResult[]>([]);
  const [message, setMessage] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  async function searchAddress(value = query) {
    const search = value.trim();
    if (search.length < 3) {
      setResults([]);
      setMessage("");
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`/api/address?q=${encodeURIComponent(search)}`, { signal: controller.signal });
      const json = await res.json();
      const list = Array.isArray(json.results) ? json.results : [];
      setResults(list);
      if (list.length === 0) setMessage("No matching NZ address found. Please type the address manually.");
    } catch (error: any) {
      if (error?.name !== "AbortError") {
        setResults([]);
        setMessage("Address lookup is unavailable. Please type the address manually.");
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => searchAddress(query), 450);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function choose(r: AddressResult) {
    onSelect({ street_address: r.street_address || "", suburb: r.suburb || "", city: r.city || "", postcode: r.postcode || "", display: r.display });
    setQuery(r.display);
    setResults([]);
    setMessage("");
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 md:col-span-2">
      <label>
        <span className="label">Search NZ address</span>
        <div className="mt-1 flex flex-col gap-2 sm:flex-row">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Start typing a NZ address, for example: 16 Cassie Close"
            className="input"
          />
          <button type="button" onClick={() => searchAddress()} className="btn-secondary py-2">
            {loading ? "Searching..." : "Find"}
          </button>
        </div>
      </label>
      {results.length > 0 && (
        <div className="mt-3 max-h-60 overflow-y-auto rounded-lg border border-stone-200 bg-white shadow-soft">
          {results.map((r, i) => (
            <button
              key={`${r.display}-${i}`}
              type="button"
              onClick={() => choose(r)}
              className="block w-full border-b px-3 py-2 text-left text-sm hover:bg-stone-100"
            >
              <span className="font-semibold">{r.display}</span>
              {(r.suburb || r.city || r.postcode) && <span className="block text-xs text-stone-500">{[r.suburb, r.city, r.postcode].filter(Boolean).join(" · ")}</span>}
            </button>
          ))}
        </div>
      )}
      {message && <p className="mt-2 text-xs font-semibold text-amber-700">{message}</p>}
      <p className="mt-2 text-xs text-stone-500">
        NZ address autocomplete can use Addy when configured, with OpenStreetMap/Nominatim as fallback. Please confirm the selected address before submitting.
      </p>
    </div>
  );
}
