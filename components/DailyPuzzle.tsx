"use client";

import { useEffect, useState } from "react";

const symbols: Record<string, string> = { K: "♔", Q: "♕", k: "♚" };
const names: Record<string, string> = { K: "White king", Q: "White queen", k: "Black king" };
const nzDate = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Pacific/Auckland", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
export function puzzleForDay(day: string) {
  const index = Math.floor(Date.parse(`${day}T00:00:00Z`) / 86400000);
  const mirror = index % 2 === 1;
  const flip = Math.floor(index / 2) % 2 === 1;
  const startRank = 1 + Math.floor(index / 4) % 6;
  const square = (file: number, rank: number) => `${"abcdefgh"[mirror ? 7 - file : file]}${flip ? 9 - rank : rank}`;
  return { board: { [square(7, 8)]: "k", [square(5, 6)]: "K", [square(6, startRank)]: "Q" }, from: square(6, startRank), to: square(6, 7) };
}

export default function DailyPuzzle() {
  const [day, setDay] = useState("");
  const [solved, setSolved] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState("Select a white piece, then its destination.");
  useEffect(() => {
    let activeDate = "";
    const refresh = () => {
      const date = nzDate();
      if (activeDate !== date) {
          activeDate = date;
          setDay(date);
          let done = false;
          try { done = localStorage.getItem(`akcc-daily-puzzle-v1:${date}`) === "solved"; } catch {}
          setSolved(done); setSelected(null);
          setMessage(done ? "You solved today’s puzzle. Well done!" : "Select a white piece, then its destination.");
      }
    };
    refresh();
    const timer = window.setInterval(refresh, 30000);
    const sync = () => { activeDate = ""; refresh(); };
    window.addEventListener("storage", sync);
    return () => { window.clearInterval(timer); window.removeEventListener("storage", sync); };
  }, []);
  const puzzle = day ? puzzleForDay(day) : null;
  const board: Record<string, string> = puzzle ? { ...puzzle.board } : {};
  if (solved && puzzle) { delete board[puzzle.from]; board[puzzle.to] = "Q"; }
  function choose(square: string) {
    if (!puzzle || solved) return;
    if (board[square] === "Q" || board[square] === "K") { setSelected(square); setMessage("Now select the destination square."); return; }
    if (!selected) { setMessage("Select a white piece first."); return; }
    if (selected === puzzle.from && square === puzzle.to) {
      setSolved(true); setSelected(null); setMessage("Checkmate! You solved today’s puzzle. Well done!");
      try { localStorage.setItem(`akcc-daily-puzzle-v1:${day}`, "solved"); } catch {}
    } else { setSelected(null); setMessage("That isn’t checkmate. Try again — White to move."); }
  }
  return <section className="card p-5" aria-labelledby="daily-puzzle-title">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 id="daily-puzzle-title" className="text-2xl font-extrabold">Daily Chess Puzzle</h2><span className={`rounded-full px-3 py-1 text-xs font-bold ${solved ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>{solved ? "✓ Solved" : "Mate in one"}</span></div>
    <p className="mt-2 text-sm text-stone-600">White to move. Find checkmate in one move.</p>
    <div className="mx-auto mt-4 grid w-full max-w-[360px] grid-cols-8 overflow-hidden rounded-lg border border-stone-400" aria-label="Chess puzzle board">
      {Array.from({ length: 64 }, (_, i) => {
        const rank = 8 - Math.floor(i / 8), file = i % 8, square = `${"abcdefgh"[file]}${rank}`, piece = board[square];
        return <button key={square} type="button" disabled={!puzzle || solved} onClick={() => choose(square)} aria-label={`${square}${piece ? `, ${names[piece]}` : ", empty"}`} aria-pressed={selected === square} className={`relative flex aspect-square items-center justify-center text-[clamp(22px,5vw,38px)] leading-none disabled:opacity-100 ${selected === square ? "bg-amber-300 ring-2 ring-inset ring-amber-600" : (file + rank) % 2 === 0 ? "bg-[#b58863]" : "bg-[#f0d9b5]"} focus-visible:z-10 focus-visible:outline focus-visible:outline-4 focus-visible:outline-blue-600`}><span aria-hidden="true" style={{ fontFamily: '"DejaVu Sans", "Segoe UI Symbol", serif', color: piece === "k" ? "#18181b" : "#fff", textShadow: piece === "k" ? "none" : "0 1px 2px #000, 1px 0 #333, -1px 0 #333" }}>{piece ? symbols[piece] : ""}</span>{file === 0 && <span aria-hidden="true" className="absolute left-0.5 top-0.5 text-[9px] text-stone-800">{rank}</span>}{rank === 1 && <span aria-hidden="true" className="absolute bottom-0 right-1 text-[9px] text-stone-800">{"abcdefgh"[file]}</span>}</button>;
      })}
    </div>
    <p role="status" aria-live="polite" className={`mt-3 text-sm font-semibold ${solved ? "text-emerald-700" : "text-stone-700"}`}>{day ? message : "Loading today’s puzzle…"}</p>
    {!solved && <button type="button" disabled={!day} onClick={() => { setSelected(null); setMessage("Hint: move the queen next to the black king, protected by your king."); }} className="mt-2 rounded-md border border-stone-300 px-3 py-1.5 text-sm font-bold hover:bg-stone-100">Hint</button>}
    <p className="mt-3 text-xs text-stone-500">A rotating collection of beginner puzzles. Changes at midnight New Zealand time. Your solved status is saved on this browser.</p>
  </section>;
}
