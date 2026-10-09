import Stripe from "stripe";
export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || (!key.startsWith("sk_test_") && !key.startsWith("sk_live_"))) {
    throw new Error("Missing or invalid STRIPE_SECRET_KEY. It must start with sk_test_ or sk_live_.");
  }
  return new Stripe(key);
}
