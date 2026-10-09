import PageShell from "@/components/PageShell";
import Link from "next/link";

export default async function PaymentCancel({ searchParams }: { searchParams: Promise<{ registration_id?: string; membership_id?: string }> }) {
  const sp = await searchParams;
  const reference = sp.registration_id || sp.membership_id;
  return (
    <PageShell>
      <main className="container-page py-20">
        <div className="card mx-auto max-w-2xl p-8 text-center">
          <h1 className="text-3xl font-extrabold text-red-700">Payment Not Completed</h1>
          <p className="mt-3 text-slate-600">
            You left the payment page. Your entry is not confirmed unless Stripe has verified payment. If your bank shows a payment, do not pay again. Contact info@aucklandknights.co.nz with your entry reference or receipt so we can check it.
          </p>
          {reference && <p className="mt-4 break-all text-sm"><b>Entry reference:</b> {reference}</p>}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/tournaments" className="btn-secondary">Back to Tournaments</Link>
            <Link href="/join" className="btn-primary">Back to Membership</Link>
          </div>
        </div>
      </main>
    </PageShell>
  );
}
