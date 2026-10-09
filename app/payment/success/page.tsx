import PageShell from "@/components/PageShell";
import Link from "next/link";
import PaymentVerification from "@/components/PaymentVerification";
export const dynamic = "force-dynamic";
export default async function PaymentSuccess({ searchParams }: { searchParams: Promise<{ session_id?: string; registration_id?: string; membership_id?: string }> }) {
  const sp = await searchParams;
  return <PageShell><main className="container-page py-20"><div className="card mx-auto max-w-2xl p-8 text-center">
    <PaymentVerification sessionId={sp.session_id || ""} reference={sp.registration_id || sp.membership_id || ""} />
    <div className="mt-6 flex flex-wrap justify-center gap-3"><Link href="/tournaments" className="btn-secondary">View Tournaments</Link><Link href="/" className="btn-primary">Back to Home</Link></div>
  </div></main></PageShell>;
}
