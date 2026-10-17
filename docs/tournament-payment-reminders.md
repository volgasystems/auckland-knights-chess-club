# Tournament payment reminders

## Activate

1. Run `supabase/migrations/20261018_tournament_payment_reminders.sql` in the AKCC Supabase SQL Editor. It adds nullable tracking fields and a per-tournament reminder switch; it does not change payment status or charge anyone.
2. In Vercel project Settings → Environment Variables, add `CRON_SECRET` for Production. Use a random secret of at least 32 characters (e.g. a password-manager-generated value); do not use the Stripe or Supabase key. Redeploy after adding it.
3. Check Settings → Cron Jobs for `/api/cron/tournament-payment-reminders`. The daily schedule is 19:00 UTC, around 8 am NZDT / 7 am NZST. Hosting can delay execution.
4. Admin → Tournament Registrations shows setup status. Admin and Super Admin can click **Send due reminders now**; the selected tournament filter is respected. This sends actual emails, after Stripe checks, through the configured club email provider. It does not charge cards.
5. Admin → Tournaments → Edit → **Send pending-payment reminder emails** turns reminders on/off for each event. Existing tournaments default to enabled when the migration runs. Verify the start and registration-close dates before enabling the scheduler.

## Rules

- Only pending, failed or expired unpaid entries for open tournaments are eligible.
- First reminder: at least 24 hours after registration. Further reminders: at least three days after the last sent reminder. A final reminder may be sent within the final 24 hours, with at least 24 hours between attempts.
- The cutoff is the earlier of registration-close time or tournament start, using stored timestamps. Missing start dates disable reminders. The daily scheduler may not send on an exact anniversary and never sends after cutoff.
- Stripe is checked first. Paid payments are reconciled; completed/processing payments and full refunds are not asked to pay again. Missing/mismatched/unverifiable checkout records are held for review.
- Paid players with matching player name and date of birth suppress abandoned duplicate entries, including those using another email. Full tournaments are excluded.
- Entry claims and unique delivery logs prevent concurrent/manual jobs from sending duplicate reminders. Queued or failed/uncertain sends are held for administrator review rather than blindly resent. External SMTP delivery is not an exactly-once transaction.
- A run processes up to 100 reminders within a 240-second budget. Review returned counts, execution logs and Email Diagnostics for backlogs or failures.
- Emails identify the player, tournament, amount, reference, verified payment explanation, deadline and a signed link to continue the same registration. They advise against paying twice and provide the club contact for cancellation/help.
- Reminder links are signed, expire at cutoff and disclose no DOB/contact fields. Opening the link does not create checkout; the player must click the payment button. A reusable open session is preferred. An expired checkout can be replaced using a deterministic Stripe idempotency key and compare-and-set update of the same entry. No new registration is inserted. Club membership and capacity are rechecked before continuing.

## Review reasons and delivery

Select report columns **Payment status explanation** and **Last payment reminder**, or use **Check payment / retry confirmation**. Pending alone is not evidence of a declined payment. Checkout may be incomplete or expired, or payment may still be processing. Bank-specific decline reasons are not invented. Provider errors are visible in Email Diagnostics. Cron authorization failures mean CRON_SECRET is missing or incorrect; schema failures mean the SQL update is missing. A configured secret does not prove a successful cron execution—check Vercel execution history.
