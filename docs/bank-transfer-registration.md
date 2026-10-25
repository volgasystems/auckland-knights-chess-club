# Registration by bank transfer

The account save fix detects legacy `account_name`, `bank_account_name` and `bank_account_number` columns independently and populates each detected alias from validated canonical `name`/`account_number` values on create and update. Network failures reset the Save button.

## Activate

1. Run the complete `supabase/migrations/20261025_bank_transfer_registration.sql` in the **AKCC** Supabase SQL Editor. It is additive and repeatable. It includes the previous manual tournament approval function and receipt audit columns, so the older manual-payment migration need not be run separately. It does not mark any registration paid or remove data.
2. In **Admin → Payment Accounts**, save the real club account. Enter the club account name and number supplied by the administrator, a usage code and its purpose. Keep real bank details in the database, not in source control. Do not use test accounts in production.
3. Mark the account Active and tick the membership and/or tournament default boxes. Only one active default is allowed per type. Untick the old default before choosing a different one. A tournament's explicitly selected payment account takes precedence. An inactive explicitly selected event account disables bank transfer for that event until corrected. With no default, a sole active account can be used; multiple accounts are never guessed.
4. Reload `/join` and the tournament registration page. Bank transfer is selectable only after the schema and an appropriate active account are available. Stripe remains available as before.

## Registration and confirmation

The server calculates the fee, selects the bank account, and snapshots its details with an M/T-prefixed unique reference. Client-supplied amounts and bank details are ignored. The screen and registration acknowledgement email show account name, number, amount and reference. If email fails the screen remains usable. Identical pending bank submissions reuse the existing reference; database unique indexes stop concurrent duplicate bank submissions. Changed registrations or existing payments require admin review.

The stored status remains `pending_payment`; reports display **Tentative — bank transfer**. Tentative entries are excluded from public confirmed-player lists and paid revenue. They do not reserve a tournament place. Membership and tournament fees remain separate. Consent and active-member restrictions are unchanged.

Admin/Super Admin checks the bank receipt, opens the green **Confirm payment** button, selects **Bank transfer received**, enters the reference/note and ticks the full-payment acknowledgement. Tournament approvals use the existing audited transaction; membership approvals use a new audited transaction and the existing membership-number/activation/email logic. Receipts include approving admin, time, method, note and original fee. Retries do not add a receipt. A failed membership activation can be retried using the same button; do not record payment again. Tournament confirmation checks remaining capacity and existing confirmed players. Existing Stripe checkouts remain subject to Stripe verification before any offline approval.

Choose **Payment method** and **Bank reference** in registration report columns for CSV/PDF reconciliation. Bank-transfer entries are skipped by Stripe reminder/resume flows to avoid asking for a second payment. Bank receipt detection is manual; there is no bank-feed integration. This release covers new memberships and tournament registrations; the separate existing membership renewal checkout remains Stripe-based.

## Verification

Automated tests cover legacy account names, server-controlled fees/accounts, pending state, repeated submissions, account selection, acknowledgement emails, reminder suppression, admin authorisation, atomic/idempotent receipt creation, duplicate indexes, refunds and capacity checks. No real payment, refund, membership approval or production test registration was performed.
