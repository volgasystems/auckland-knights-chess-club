# Tournament payment confirmation and recovery

Paid entries become public only after the stored registration is marked `paid` and `confirmed`. A Checkout return URL alone is not proof of payment.

The webhook and return verification share `confirmTournamentPayment`. It validates the Stripe payment status, checkout session, registration metadata, NZD amount and live/test mode. Database errors fail the webhook so Stripe retries. Email acceptance is tracked separately in `email_delivery_logs`; an email failure leaves the payment confirmed and can be retried. Payment receipts and email claims use existing primary keys, so no schema migration is required. Existing receipts with older random IDs are also recognised by session ID.

## Production configuration

In Vercel production, configure the live `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and an HTTPS `NEXT_PUBLIC_SITE_URL` for the club. Production checkout refuses test keys, missing webhook secrets and invalid return URLs. No secrets are returned to browsers.

Register the live Stripe webhook at `https://www.aucklandknights.co.nz/api/stripe/webhook` for:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `checkout.session.expired`

A signing secret being configured does not prove endpoint delivery. Check Stripe Workbench delivery results. Successful processing returns HTTP 200; database/email problems return HTTP 503 for retry. Check Vercel logs using the event ID; do not paste keys or payer data into logs or chat.

## Recover an existing registration

Open Admin > Tournament Registrations. Payment Configuration reports key mode, Stripe API connection and email configuration without showing secrets.

For a payer whose card was charged but whose entry is pending, click **Check payment / retry email** on that row. This reads its existing Stripe session and updates a paid entry; it does not create a charge. Refresh the report after recovery. If no session is linked, check Stripe manually before confirming anything or requesting another payment.

If email is pending or failed, use Admin > Email Diagnostics to verify SMTP/Resend and send a test email to an authorised recipient, then retry the registration email. Provider acceptance is recorded as sent; inbox delivery or spam filtering still needs the recipient/provider to verify.

## Checks

Run `node --test tests/tournament-payments.test.cjs` and `npx tsc --noEmit`, then verify the Vercel preview build before merging. Test cases cover paid/unpaid states, metadata and amount validation, replay/concurrency, delayed payment, email failures/retries, database errors, checkout-link failure, missing fees, club-member eligibility, separate member tournament payment and admin permissions.

A full real-money payment was not exercised by the automated tests. The admin diagnostic and Stripe delivery history are needed to validate the deployed account and webhook. Existing capacity checks count confirmed players at registration time; simultaneous pending checkouts do not reserve places.

## Registration and event policy

Club (`club_calendar`) events require an active paid/manual-paid/waived membership with a current expiry and a matching player name/email. General/open events allow everyone. All tournament registrations require the configured positive entry/category fee, including club members; membership does not waive tournament payment. Configure a fee in Admin > Tournaments or Calendar before enabling registration. Missing fees stop checkout with a clear message.

Membership and tournament checkout send a registration-received acknowledgement to the registrant after the checkout has been linked. It states Pending payment and does not claim confirmation. Payment verification sends a separate confirmation using existing delivery tracking. Acknowledgement failures are logged and do not invalidate a saved checkout or take payment. Actual inbox delivery requires a working verified email provider.
