export function paymentConfiguration(env: NodeJS.ProcessEnv = process.env) {
  const key = env.STRIPE_SECRET_KEY || "";
  const mode = key.startsWith("sk_live_") ? "live" : key.startsWith("sk_test_") ? "test" : "not_configured";
  const production = env.VERCEL_ENV === "production";
  let siteUrl = "";
  try {
    const url = new URL(env.NEXT_PUBLIC_SITE_URL || "");
    if (!production || (url.protocol === "https:" && !["localhost", "127.0.0.1"].includes(url.hostname))) siteUrl = url.origin;
  } catch {}
  const webhookConfigured = !!env.STRIPE_WEBHOOK_SECRET?.startsWith("whsec_");
  return { mode, production, siteUrl, webhookConfigured, available: mode !== "not_configured" && (!production || mode === "live") && !!siteUrl && webhookConfigured };
}

export function assertPaymentReady() {
  if (!paymentConfiguration().available) throw new Error("Online payment is temporarily unavailable. Your entry has not been confirmed. Please contact info@aucklandknights.co.nz before trying again.");
}
