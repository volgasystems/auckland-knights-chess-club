import Link from "next/link";
import Image from "next/image";
import { UserRound, Trophy } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-black text-white">
      {/* Blended chess background image. The image is part of the hero background, not a separate card. */}
      <div className="absolute inset-0">
        <Image
          src="/hero-chess-blended-background.png"
          alt="Black and gold chess pieces on a chessboard"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center opacity-95"
        />
        {/* Strong left overlay keeps text readable while blending the image into the black background. */}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,#000000_0%,rgba(0,0,0,0.94)_24%,rgba(0,0,0,0.72)_48%,rgba(0,0,0,0.42)_72%,rgba(0,0,0,0.78)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_68%_45%,rgba(200,155,44,0.20),transparent_32%)]" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black via-black/55 to-transparent" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:84px_84px] opacity-20" />
      </div>

      <div className="container-page relative min-h-[440px] py-16 lg:py-20">
        <div className="max-w-2xl">
          <p className="mb-5 text-sm font-extrabold uppercase tracking-[0.35em] text-akcc-gold">
            Welcome to
          </p>
          <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-tight md:text-6xl">
            Auckland Knights
            <span className="block text-akcc-gold">Chess Club</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-stone-100">
            Building strong minds and great friendships through the game of chess.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/join" className="btn-gold gap-2">
              <UserRound className="h-4 w-4" /> Join the Club
            </Link>
            <Link
              href="/tournaments"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-akcc-gold/80 px-6 py-3 text-sm font-extrabold uppercase tracking-wide text-white transition hover:bg-akcc-gold hover:text-black"
            >
              <Trophy className="h-4 w-4" /> View Tournaments
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
