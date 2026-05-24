import PageShell from "@/components/PageShell";

const usefulLinks = [
  {
    name: "NZCF",
    description: "New Zealand Chess Federation website for national chess information, ratings, events and official chess updates.",
    href: "https://newzealandchess.co.nz/"
  },
  {
    name: "Auckland Chess Association / ACA",
    description: "Auckland Chess Association website for Auckland chess news, local events and regional chess information.",
    href: "https://chessauckland.nz/"
  },
  {
    name: "New Zealand Chess",
    description: "New Zealand chess information, resources and community links.",
    href: "https://newzealandchess.nz/"
  }
];

export default function LinksPage() {
  return (
    <PageShell>
      <main className="container-page py-12">
        <section className="rounded-3xl bg-akcc-blue p-8 text-white shadow-soft lg:p-12">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-blue-100">Useful Chess Links</p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">Links</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-blue-100">
            Helpful New Zealand chess websites for players, parents, coaches and tournament organisers.
          </p>
        </section>

        <section className="mt-10 grid gap-6 md:grid-cols-3">
          {usefulLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="card group flex flex-col p-6 transition hover:border-akcc-blue"
            >
              <div className="text-3xl text-akcc-blue">♞</div>
              <h2 className="mt-4 text-2xl font-extrabold text-akcc-navy group-hover:text-akcc-blue">{link.name}</h2>
              <p className="mt-3 flex-1 leading-7 text-slate-700">{link.description}</p>
              <span className="mt-6 text-sm font-bold text-akcc-blue">Open website →</span>
            </a>
          ))}
        </section>
      </main>
    </PageShell>
  );
}
