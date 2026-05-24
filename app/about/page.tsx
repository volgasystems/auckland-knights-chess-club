import PageShell from "@/components/PageShell";
import Link from "next/link";

const offerItems = [
  "Chess learning support for beginners and junior players",
  "Friendly weekly chess practice sessions",
  "Opportunities for children and adults to play and improve",
  "Guidance from experienced and competitive players",
  "Junior chess events under the Junior Knights programme",
  "Future club tournaments and community chess events",
  "A pathway toward organising FIDE-rated tournaments in the future"
];

const juniorItems = [
  "Logical thinking",
  "Patience and concentration",
  "Confidence",
  "Problem-solving skills",
  "Respect for opponents",
  "Tournament readiness"
];

export default function AboutPage() {
  return (
    <PageShell>
      <main className="container-page py-12">
        <section className="overflow-hidden rounded-3xl bg-akcc-blue text-white shadow-soft">
          <div className="grid gap-8 p-8 lg:grid-cols-[1.6fr_1fr] lg:p-12">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-blue-100">About Us</p>
              <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">About Auckland Knights Chess Club</h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-blue-50">
                Auckland Knights Chess Club is a new community-focused chess club created to support young players, beginners, and chess-loving adults across South Auckland and East Auckland.
              </p>
              <p className="mt-4 max-w-3xl leading-8 text-blue-100">
                The club has been inspired by CM Sai Vivan Karthikeya Somaraju, one of New Zealand’s talented young chess players, who wanted to create a friendly place where children and adults can learn, practise, improve, and enjoy chess together.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/join" className="btn-gold">Join Now</Link>
                <Link href="/tournaments" className="rounded-md border border-white/30 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10">View Tournaments</Link>
              </div>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-6">
              <h2 className="text-2xl font-extrabold">Learn. Play. Improve. Compete.</h2>
              <p className="mt-4 leading-7 text-blue-100">
                Whether you are completely new to chess, returning after many years, or already playing in tournaments, Auckland Knights Chess Club welcomes you.
              </p>
              <p className="mt-4 font-bold text-white">Become a Knight.</p>
            </div>
          </div>
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-2">
          <article className="card p-8">
            <h2 className="text-3xl font-extrabold text-akcc-navy">Our Goal</h2>
            <p className="mt-4 leading-8 text-slate-700">
              Our goal is to make chess more accessible to families and players in the local community. Whether you are completely new to chess, returning after many years, or already playing in tournaments, Auckland Knights Chess Club welcomes you.
            </p>
            <p className="mt-4 leading-8 text-slate-700">
              Sai will also share his chess learning experience, ideas, and practical tips with beginners and junior players. From time to time, he will help guide young players through weekly learning sessions, practice games, and chess improvement discussions.
            </p>
          </article>
          <article className="card p-8">
            <h2 className="text-3xl font-extrabold text-akcc-navy">Our Vision</h2>
            <p className="mt-4 leading-8 text-slate-700">
              To build a strong and supportive chess community in South Auckland and East Auckland, where children, families, and adults can develop their chess skills, confidence, discipline, and sportsmanship.
            </p>
          </article>
        </section>

        <section className="mt-10 card p-8">
          <h2 className="text-3xl font-extrabold text-akcc-navy">What We Offer</h2>
          <p className="mt-3 text-slate-700">Auckland Knights Chess Club aims to provide:</p>
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {offerItems.map((item) => (
              <div key={item} className="rounded-2xl border border-slate-200 bg-akcc-pale p-5">
                <div className="text-2xl text-akcc-blue">♞</div>
                <p className="mt-3 font-semibold text-slate-800">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <article className="card p-8">
            <h2 className="text-3xl font-extrabold text-akcc-navy">Junior Knights Programme</h2>
            <p className="mt-4 leading-8 text-slate-700">
              The Junior Knights programme will focus on helping young players learn chess in a structured, friendly, and encouraging environment. The aim is to support children from beginner level through to competitive tournament play.
            </p>
          </article>
          <article className="card p-8">
            <h3 className="text-2xl font-extrabold text-akcc-navy">Junior players will be encouraged to develop</h3>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {juniorItems.map((item) => (
                <div key={item} className="rounded-xl border border-slate-200 p-4 font-semibold text-slate-700">{item}</div>
              ))}
            </div>
          </article>
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-2">
          <article className="card p-8">
            <h2 className="text-3xl font-extrabold text-akcc-navy">Our Future Plans</h2>
            <p className="mt-4 leading-8 text-slate-700">
              As the club grows, Auckland Knights Chess Club plans to organise regular events, junior competitions, training sessions, and eventually FIDE-rated tournaments to give local players more opportunities to compete and improve.
            </p>
            <p className="mt-4 leading-8 text-slate-700">
              We believe South Auckland and East Auckland have many talented young players and chess-interested families. Auckland Knights Chess Club wants to provide a local platform for these players to learn, connect, and grow.
            </p>
          </article>
          <article className="rounded-3xl bg-white p-8 shadow-soft ring-1 ring-slate-200">
            <h2 className="text-3xl font-extrabold text-akcc-navy">Join Us</h2>
            <p className="mt-4 leading-8 text-slate-700">
              Whether you are a parent looking for chess opportunities for your child, a beginner wanting to learn, or an adult who enjoys the game, Auckland Knights Chess Club is here to welcome you.
            </p>
            <p className="mt-5 text-2xl font-extrabold text-akcc-blue">Learn. Play. Improve. Compete. Become a Knight.</p>
            <Link href="/join" className="btn-primary mt-6">Join Now</Link>
          </article>
        </section>
      </main>
    </PageShell>
  );
}
