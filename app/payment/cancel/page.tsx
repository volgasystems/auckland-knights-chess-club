import PageShell from "@/components/PageShell";
import Link from "next/link";

export default function PaymentCancel() {
  return (
    <PageShell>
      <main className="container-page py-20">
        <div className="card mx-auto max-w-2xl p-8 text-center">
          <h1 className="text-3xl font-extrabold text-red-700">Payment Not Completed</h1>
          <p className="mt-3 text-slate-600">
            Your registration has not been confirmed because payment was not completed. It will remain as Pending Payment and will not appear in confirmed entries.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/tournaments" className="btn-secondary">Back to Tournaments</Link>
            <Link href="/join" className="btn-primary">Back to Membership</Link>
          </div>
        </div>
      </main>
    </PageShell>
  );
}
