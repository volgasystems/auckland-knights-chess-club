import Link from "next/link";
import { Download, FileText, Rocket, ShieldCheck } from "lucide-react";

const docs = [
  {
    title: "Deployment Guide",
    description: "Step-by-step production deployment guide for Vercel, Supabase, Stripe, email configuration, custom domain, and go-live checks.",
    href: "/docs/akcc_deployment_guide.pdf",
    icon: Rocket,
    tag: "Technical setup"
  },
  {
    title: "Admin & Super Admin User Guide",
    description: "Product user guide for Super Admins and Admins covering members, tournaments, calendar, payments, reports, email, social posts, and settings.",
    href: "/docs/akcc_admin_super_admin_user_guide.pdf",
    icon: ShieldCheck,
    tag: "Operations guide"
  }
];

export default function DocumentationPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-akcc-gold">Auckland Knights Chess Club</p>
        <h1 className="mt-2 text-3xl font-extrabold text-stone-950">Product Documentation</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-700">
          Download the latest deployment and admin user documentation. These documents are included with the deployable application package and can be shared with technical support, club admins, or committee members.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {docs.map((doc) => {
          const Icon = doc.icon;
          return (
            <section key={doc.href} className="rounded-2xl border border-stone-200 bg-white p-6 shadow-soft">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-black text-akcc-gold">
                  <Icon className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-extrabold uppercase tracking-wide text-akcc-gold">{doc.tag}</div>
                  <h2 className="mt-1 text-xl font-extrabold text-stone-950">{doc.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-stone-700">{doc.description}</p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link href={doc.href} target="_blank" className="inline-flex items-center gap-2 rounded-lg border border-stone-300 px-4 py-2 text-sm font-bold text-stone-900 hover:border-black">
                      <FileText className="h-4 w-4" /> Open PDF
                    </Link>
                    <a href={doc.href} download className="inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-bold text-white hover:bg-akcc-gold hover:text-black">
                      <Download className="h-4 w-4" /> Download PDF
                    </a>
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-stone-800">
        <b>Note:</b> Keep these PDFs updated whenever the application configuration or operating process changes. For production deployment, store environment variables in Vercel rather than committing secret values to GitHub.
      </section>
    </div>
  );
}
