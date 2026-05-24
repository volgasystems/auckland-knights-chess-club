"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const statusLabels: Record<string, string> = {
  new: "New",
  in_progress: "In Progress",
  responded: "Responded",
  closed: "Closed"
};


function formatStableDate(value: string | null | undefined) {
  if (!value) return "";
  const datePart = String(value).slice(0, 10);
  const parts = datePart.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return String(value);
}

function statusClass(status: string) {
  if (status === "closed") return "bg-slate-100 text-slate-700";
  if (status === "responded") return "bg-green-100 text-green-800";
  if (status === "in_progress") return "bg-amber-100 text-amber-800";
  return "bg-blue-100 text-blue-800";
}

export default function EnquiriesManager({ enquiries }: { enquiries: any[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function updateStatus(id: string, status: string) {
    setBusyId(id);
    try {
      const res = await fetch("/api/admin/crud", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table: "contact_enquiries",
          action: "update",
          id,
          payload: { status }
        })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Unable to update enquiry status");
      router.refresh();
    } catch (error: any) {
      alert(error.message || "Unable to update enquiry status");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="card mt-6 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-100 text-left">
          <tr>
            {["Date", "Name", "Type", "Subject", "Email", "Phone", "Message", "Status", "Actions"].map((h) => (
              <th key={h} className="p-3">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {enquiries.map((e: any) => (
            <tr key={e.id} className="border-t align-top">
              <td className="p-3 whitespace-nowrap">{formatStableDate(e.created_at)}</td>
              <td className="p-3 font-bold">{e.full_name}</td>
              <td className="p-3">{e.enquiry_type}</td>
              <td className="p-3">{e.subject}</td>
              <td className="p-3">{e.email}</td>
              <td className="p-3">{e.phone}</td>
              <td className="max-w-md p-3">{e.message}</td>
              <td className="p-3">
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusClass(e.status || "new")}`}>
                  {statusLabels[e.status || "new"] || e.status}
                </span>
              </td>
              <td className="p-3">
                <div className="flex min-w-[310px] flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busyId === e.id || e.status === "in_progress"}
                    onClick={() => updateStatus(e.id, "in_progress")}
                    className="rounded-md border border-amber-300 px-3 py-1 text-xs font-bold text-amber-800 hover:bg-amber-50 disabled:opacity-40"
                  >
                    In Progress
                  </button>
                  <button
                    type="button"
                    disabled={busyId === e.id || e.status === "responded"}
                    onClick={() => updateStatus(e.id, "responded")}
                    className="rounded-md border border-green-300 px-3 py-1 text-xs font-bold text-green-800 hover:bg-green-50 disabled:opacity-40"
                  >
                    Responded
                  </button>
                  <button
                    type="button"
                    disabled={busyId === e.id || e.status === "closed"}
                    onClick={() => updateStatus(e.id, "closed")}
                    className="rounded-md border border-slate-300 px-3 py-1 text-xs font-bold text-slate-800 hover:bg-slate-50 disabled:opacity-40"
                  >
                    Close
                  </button>
                  {e.status === "closed" && (
                    <button
                      type="button"
                      disabled={busyId === e.id}
                      onClick={() => updateStatus(e.id, "new")}
                      className="rounded-md border border-blue-300 px-3 py-1 text-xs font-bold text-blue-800 hover:bg-blue-50 disabled:opacity-40"
                    >
                      Reopen
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
          {enquiries.length === 0 && (
            <tr>
              <td colSpan={9} className="p-6 text-center text-slate-500">No enquiries found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
