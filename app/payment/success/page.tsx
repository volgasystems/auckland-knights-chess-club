import PageShell from "@/components/PageShell";
import Link from "next/link";

export default function PaymentSuccess() {
  return (
    <PageShell>
      <main className="container-page py-20">
        <div className="card mx-auto max-w-2xl p-8 text-center">
          <h1 className="text-3xl font-extrabold text-akcc-blue">Payment Successful</h1>
          <p className="mt-3 text-slate-600">
            Thank you. Your payment has been received. Your registration will be confirmed by the Stripe webhook and may take a few seconds to appear in admin reports or public entries.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/tournaments" className="btn-secondary">View Tournaments</Link>
            <Link href="/" className="btn-primary">Back to Home</Link>
          </div>
        </div>
      </main>
    </PageShell>
  );
}
