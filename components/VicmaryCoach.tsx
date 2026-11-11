const achievements = [
  "Venezuela’s reigning Women’s National Champion in the top category.",
  "Gold medallist at the 2026 XXV Central American and Caribbean Games.",
  "Venezuelan national team member since 2017, representing her country at international events.",
  "Represented Venezuela at the Chess Olympiads in India (2022), Hungary (2024) and Uzbekistan (2026).",
  "Two-time Pan American School Champion in the Girls’ Under-13 and Under-15 categories.",
  "Pan American Youth Champion in the Girls’ Under-12 category in Costa Rica.",
  "Won four gold medals at the 2022 National Sporting Games and two gold medals in 2024.",
  "Earned one gold and two bronze medals at the 2024 Bolivarian Bicentennial Games."
];

export default function VicmaryCoach() {
  return <article className="card mt-5 overflow-hidden">
    <div className="grid items-start md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <img src="/images/coaches/vicmary-perez-hernandez.webp" alt="Vicmary C. Perez Hernandez, Junior Coach" width={640} height={640} className="aspect-square w-full object-cover object-top" />
      <div className="p-6 sm:p-8">
        <p className="text-sm font-bold uppercase tracking-wide text-akcc-blue">Junior Coach</p>
        <h3 className="mt-2 text-2xl font-extrabold">Vicmary C. Perez Hernandez</h3>
        <p className="mt-2 font-semibold text-stone-700">Woman FIDE Master (WFM) · Venezuela</p>
        <p className="mt-4 leading-relaxed text-stone-600">A national champion, Olympiad representative and international gold medallist, Vicmary brings extensive competitive chess experience to her role as Junior Coach at Auckland Knights Chess Club.</p>
        <a href="https://ratings.fide.com/profile/3930831" target="_blank" rel="noopener noreferrer" className="mt-4 inline-block font-bold text-akcc-blue underline underline-offset-4">View FIDE profile · ID 3930831 ↗</a>
        <h4 className="mt-6 text-lg font-bold">Career highlights</h4>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-stone-700">{achievements.map(item => <li key={item}>{item}</li>)}</ul>
      </div>
    </div>
  </article>;
}
