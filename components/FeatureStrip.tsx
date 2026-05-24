import { GraduationCap, Trophy, CalendarDays, Users } from "lucide-react";
const items = [
  { icon: Users, title: "All Ages Welcome", text: "From beginners to advanced players" },
  { icon: GraduationCap, title: "Expert Coaching", text: "Learn from experienced coaches" },
  { icon: CalendarDays, title: "Regular Events", text: "Tournaments, training and social events" },
  { icon: Trophy, title: "Strong Community", text: "Be part of the Knights chess family" }
];
export default function FeatureStrip() {
  return <section className="relative -mt-10 pb-6"><div className="container-page grid gap-4 md:grid-cols-4">{items.map(({icon:Icon,title,text})=><div key={title} className="card flex items-center gap-4 p-5"><Icon className="h-10 w-10 shrink-0 text-black"/><div><div className="font-extrabold text-black">{title}</div><div className="mt-1 text-sm text-stone-600">{text}</div></div></div>)}</div></section>
}
