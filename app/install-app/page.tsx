import PageShell from "@/components/PageShell";

const instructionCards = [
  {
    title: "iPhone Chrome",
    steps: ["Open the website in Chrome.", "Tap the Share icon near the address bar.", "Tap Add to Home Screen.", "Tap Add."],
  },
  {
    title: "iPhone Safari",
    steps: ["Open the website in Safari.", "Tap the Share button.", "Tap Add to Home Screen.", "Tap Add."],
  },
  {
    title: "Android Chrome",
    steps: ["Open the website in Chrome.", "Tap the menu ⋮.", "Tap Install app or Add to Home screen.", "Confirm Install/Add."],
  },
  {
    title: "Desktop Chrome / Edge",
    steps: ["Open the website.", "Look for the install icon in the address bar.", "Click Install.", "Open the app from your desktop/start menu."],
  },
];

export default function InstallAppPage() {
  return (
    <PageShell>
      <main className="container-page py-12">
        <section className="rounded-3xl bg-black p-8 text-white md:p-12">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-akcc-gold">Mobile App</p>
          <h1 className="mt-4 text-4xl font-extrabold md:text-5xl">Install Auckland Knights Chess Club</h1>
          <p className="mt-4 max-w-3xl text-stone-300">Install the website as an app on your phone or computer. You can quickly access tournaments, calendar, results, news, memberships and absence reporting from your home screen.</p>
        </section>
        <section className="mt-10 grid gap-5 md:grid-cols-2">
          {instructionCards.map((card) => (
            <article key={card.title} className="card p-6">
              <h2 className="text-2xl font-extrabold text-black">{card.title}</h2>
              <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-700">
                {card.steps.map((step) => <li key={step}>{step}</li>)}
              </ol>
            </article>
          ))}
        </section>
      </main>
    </PageShell>
  );
}
