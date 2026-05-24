export default function StatusBadge({ status }: { status?: string | null }) {
  const s = status || "draft";
  const cls = s === "open" ? "bg-green-100 text-green-800" : s === "completed" ? "bg-blue-100 text-blue-800" : s === "closed" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold uppercase ${cls}`}>{s}</span>;
}
