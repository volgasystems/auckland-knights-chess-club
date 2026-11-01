# Tournament withdrawals and full-fee refunds

Apply `supabase/migrations/20261102_tournament_withdrawals.sql` in the AKCC Supabase SQL Editor. The migration is additive and repeatable. It retains all registrations and payments and introduces private, service-only withdrawal/refund audit records. Deployment alone does not run the migration.

## Admin workflow

1. In Tournament Registrations, find the exact player and event. Use the amber **Withdraw / Refund** action rather than deleting a paid entry.
2. Review the saved cancellation/refund policy and payment. Enter a withdrawal reason. If a full entry-fee refund is due, tick the refund-due option; otherwise record the reason for no refund. The system does not decide eligibility from policy text.
3. Confirm withdrawal. The registration becomes cancelled (displayed as Withdrawn) and leaves public confirmed-player lists. Its original payment remains paid until a refund is verified. Neither the withdrawal nor the refund request sends money.
4. For **Stripe**, issue the full refund against the original payment in the Stripe Dashboard, checking player email, amount and transaction carefully. Return to Withdraw / Refund and choose **Verify full refund in Stripe**. The server checks the linked checkout and original charge, currency, mode and full-refund state. Partial/pending refunds do not complete the full-fee workflow. If a webhook already updated the payment to refunded, this verification completes the withdrawal audit. No app endpoint creates a Stripe refund.
5. For **bank/cash**, return the full fee outside the application first. Choose **Record bank/cash refund already returned**, enter the transaction/receipt reference, and acknowledge that the full amount was returned and not previously refunded. A verified original offline receipt is required; Stripe-linked payments cannot use this action.
6. Use registration/refund filters and choose Withdrawn at, Withdrawal reason, Refund status, Refund due and Refund reference columns for PDF/CSV reconciliation. The player row also shows the refund status.

Admin and Super Admin can act; tournament managers can inspect reports but cannot approve this financial workflow. Each action records administrator, time, reason, reference and amount. Repeated requests/completions do not duplicate the audit or return more money. If a refund was initially not required, the admin can later request a full refund for a withdrawn paid entry. Completed refunds are not reopened.

Unpaid withdrawals have no refund due. A linked open unpaid Stripe checkout is expired before withdrawal. Processing or unreconciled paid Stripe checkouts require review/Check payment first. A stale database record causes a refresh/retry rather than overwriting a concurrent payment. Late checkout-expired events cannot restore a withdrawn registration.

This release covers **admin-managed tournament withdrawal and full entry-fee refund tracking**, not public self-service requests, automatic bank payouts, automatic Stripe refund creation, partial refunds or membership withdrawals. Registrants can contact the club; the admin records their request. No withdrawal/refund notification emails are sent automatically by this workflow; use the existing email action to communicate the outcome. Do not create/delete real entries or issue real refunds as tests.
