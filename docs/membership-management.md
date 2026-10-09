# Membership numbering, search and confirmation recovery

## Deployment

Deploy the application changes first. Until the database migration is applied, ID assignment falls back to the existing `generate_membership_id` sequence. The new settings form explicitly reports that custom start numbers require the upgrade.

Run `supabase/migration_v4_4_membership_numbering.sql` once in the production Supabase SQL editor. It adds start/next/digit settings and two server-only transactional functions. It preserves existing member IDs and advances beyond IDs already in use. It does not delete member records. The updated `schema.sql` includes the same setup for new installations.

In Admin > Club Settings > Membership ID Numbering, use prefix `AKCC`, starting number `1001` and minimum digits `5` for the requested `AKCC01001` format. Existing IDs, including older prefixes, remain unchanged. Saving a lower start number does not rewind the counter. Gaps can occur when failed operations are retried; numbers are never intentionally reused. Changing a prefix starts a separate numbering range while skipping any matching historical IDs.

## Member search

Admin > Members searches by player name, exact membership ID or email, case-insensitively. Names support partial matches and multiple words (first and last names). Clear payment/membership-status filters to include pending, expired and cancelled records. Shared family email addresses can return multiple player records. CSV/PDF exports use the same search and status filters. The public tournament membership lookup continues to require an active paid membership.

## Emails

Membership confirmation now uses an active `membership_confirmation` template when available, with a default text message if no template exists. Content is escaped for HTML. Sends are claimed and recorded in `email_delivery_logs`. A sending failure does not erase the member's paid status; webhook retries and the admin recovery button can retry it.

Open Admin > Email Diagnostics to verify SMTP/Resend. This screen shows recent queued and failed emails. Send a test to an authorised recipient. Provider acceptance means sent; inbox delivery and spam filtering need separate verification with the provider or recipient.

After correcting settings, open Admin > Members and click **Check membership / retry email**. It verifies the existing Stripe session when linked, or uses an existing administrator-recorded manual-paid/waived status. It never creates a new charge. Cancelled/refunded memberships cannot be reinstated through payment replay. Retrying an expired membership does not extend its expiry.

## Validation

`node --test tests/tournament-payments.test.cjs tests/membership.test.cjs`

`npx tsc --noEmit`

The suite uses PGlite for PostgreSQL migration/function tests and mocked services for payment/email regressions. Live SQL migration and real email delivery require production access and are not implied by a passing deployment build.
