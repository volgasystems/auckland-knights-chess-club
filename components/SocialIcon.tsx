export default function SocialIcon({label}:{label:string}) {
  if (label === "Lichess") return <span aria-hidden="true" className="text-lg">♞</span>;
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
    {label === "Facebook" ? <path d="M14 22v-9h3l.5-4H14V6.5c0-1 .3-1.5 1.7-1.5H18V1.3C17.5 1.1 16.2 1 14.7 1 11.4 1 9 3 9 6.5V9H6v4h3v9z"/> :
    label === "Instagram" ? <g fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".7" fill="currentColor"/></g> :
    label === "YouTube" ? <path fillRule="evenodd" d="M6 4h12a5 5 0 0 1 5 5v6a5 5 0 0 1-5 5H6a5 5 0 0 1-5-5V9a5 5 0 0 1 5-5Zm4 4v8l6-4Z"/> :
    label === "LinkedIn" ? <><circle cx="4" cy="4" r="2"/><path d="M2 8h4v14H2zm7 0h4v2c1-2 7-4 9 2v10h-4v-9c0-3-5-3-5 0v9H9z"/></> :
    <path d="M18.9 2H22l-6.8 7.8L23 22h-6.3l-4.9-7.4L5.3 22H2l8.3-9.5L1 2h6.5l4.4 6.7zM17.8 20h1.7L6.6 4H4.8z"/>}
  </svg>;
}
