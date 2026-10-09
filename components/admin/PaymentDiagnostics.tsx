import { paymentConfiguration } from "@/lib/paymentConfig";
import { getEmailProviderStatus } from "@/lib/email";
import { getStripe } from "@/lib/stripe";
export default async function PaymentDiagnostics() {
  const email = await getEmailProviderStatus();
  const config = paymentConfiguration();
  let connection = "Not checked: payment key is missing.";
  if (config.mode !== "not_configured") {
    try {
      const balance = await getStripe().balance.retrieve();
      connection = balance.livemode ? "Stripe API connection verified in LIVE mode." : "Stripe API connection verified in TEST mode; no real payments are taken.";
    } catch { connection = "Stripe API check failed. Review the payment key in Vercel production settings."; }
  }
  return <section className="card mt-6 p-5 text-sm"><h2 className="text-xl font-bold">Payment Configuration</h2>
    <div className="mt-3 grid gap-3 md:grid-cols-2"><p><b>Confirmation email:</b> {email.configured ? `${email.providerLabel} configured` : "Not configured — fix Email Diagnostics"}</p><p><b>Stripe mode:</b> {config.mode}</p><p><b>Checkout available:</b> {config.available ? "Yes" : "No"}</p><p><b>Webhook signing secret:</b> {config.webhookConfigured ? "Configured" : "Missing"}</p><p><b>Return URL:</b> {config.siteUrl || "Missing or invalid"}</p></div>
    <p className="mt-3 font-semibold">{connection}</p>
    <p className="mt-3">The live Stripe webhook must point to <b>{config.siteUrl || "https://www.aucklandknights.co.nz"}/api/stripe/webhook</b> and deliver checkout.session.completed, checkout.session.async_payment_succeeded, checkout.session.async_payment_failed and checkout.session.expired. A configured secret alone does not verify webhook delivery.</p>
    <p className="mt-3">If an entry is pending but the payer was charged, use Check payment / retry email below. This checks the existing Stripe session and does not create a new charge. Check Email Diagnostics for email-provider failures.</p>
  </section>;
}
