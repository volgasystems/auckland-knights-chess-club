import Image from "next/image";

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
      <section className="max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-soft">
        <Image src="/logo.png" alt="Auckland Knights Chess Club" width={96} height={96} className="mx-auto rounded-full" />
        <h1 className="mt-6 text-3xl font-extrabold">You are offline</h1>
        <p className="mt-3 text-sm leading-6 text-stone-300">Auckland Knights Chess Club is temporarily unavailable because your device is offline. Please reconnect and try again.</p>
        <a href="/" className="btn-gold mt-6">Try Home Page</a>
      </section>
    </main>
  );
}
