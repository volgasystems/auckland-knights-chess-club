# Membership lookup, renewals and fees

Apply `supabase/migration_v4_6_membership_renewals.sql` in the production Supabase SQL Editor. It creates private renewal records and a transactional, service-only fulfillment function. Existing member IDs and payments are retained. No public read policies are added for renewals.

Admin > Membership Fees & Options supports adding and editing fees in dollars, descriptions, active status and validity rules. Active fees appear immediately on Join Now and renewal checkout; the server loads fees from the database and snapshots each renewal. Pending/completed payments keep their original prices. Calendar end month (1–12) takes precedence over rolling validity months; clear that month to use rolling periods.

Join Now > Find Your Membership / Renew requires the registered email, with an optional exact surname to narrow family matches. IDs and signed links are emailed to that address; no player records are returned by public surname search. Links expire after 30 minutes. Repeated requests for the same email within a minute are throttled. Delivery requires working SMTP/Resend settings. This lookup is separate from the existing active-membership tournament lookup.

Follow the emailed link, choose an active membership option and accept terms, then pay through Stripe. Renewal preserves the member ID. Its period begins the day after current expiry, or today in Auckland if already expired. A paid renewal extends validity once even if webhook/return-page events repeat or arrive concurrently. Cancelled/refunded members require administrator review. Failed/abandoned renewal checkouts leave the original membership status/payment unchanged.

Each renewal has its own receipt and confirmation email delivery record. Admin > Members > Check membership / retry email reconciles recent linked renewal checkouts without creating a charge. It can retry failed emails after provider settings are corrected.

Tests use mocked Stripe/email plus PostgreSQL/PGlite for migration and concurrency. Production payment and inbox delivery are not implied by passing tests.
