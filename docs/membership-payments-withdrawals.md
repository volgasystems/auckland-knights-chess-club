# Membership manual payments, withdrawal and full-receipt refunds

Apply `supabase/migrations/20261102_membership_payments_withdrawals.sql` in **AKCC** Supabase SQL Editor. This is additive and repeatable. It retains member IDs, registrations and receipts, adds private audit history, and enables the server-only financial functions. Production deployment does not run SQL.

## Cash/bank/manual confirmation

In Members, Admin/Super Admin sees the green confirmation icon on eligible unpaid/pending/failed/expired memberships. It no longer requires the member to have selected bank transfer during registration. Choose Cash received, Bank transfer received or Other payment verified manually, enter a 5-500 character reference/note and acknowledge receipt of the full fee. The original server-saved fee is used. The payment receipt and approval audit are transactional; membership activation/ID assignment uses existing logic. Retry activation if it failed, not a new payment.

For an existing unpaid Stripe checkout, the server validates and expires its open link before offline approval. Completed paid Stripe checkout uses Stripe verification instead of creating a cash receipt; refunded/processing/mismatched payments are held for review. Already paid, waived, refunded, cancelled or withdrawn memberships cannot be charged again through this action. Manual payment registration is for the original unpaid membership; existing renewal receipts are managed separately, not replaced with another initial payment.

## Withdrawal / refund

The amber icon opens membership withdrawal and refund management. Select the correct original membership or renewal receipt, review applicable membership terms, enter a reason and confirm review. Withdrawal cancels active membership eligibility while retaining the member ID, dates and all payment history. It does **not** cancel independent tournament entries. Membership refund eligibility is an admin decision; there is no automatic interpretation of the membership terms.

Withdrawal may have no refund, or a full refund of the selected paid receipt due. A no-refund withdrawal does not create a money obligation. Money remains recorded as received until the refund is verified. There is no bank payout integration and no application endpoint issues a Stripe refund.

For Stripe, refund the selected original payment in the Stripe Dashboard first, then use Verify Stripe refund. The server checks the matching checkout/payment intent, amount, currency, live/test mode and successful full charge refund. Partial or pending refunds remain pending. For bank/cash, return the money separately, then Record returned refund with the transaction/reference and explicit acknowledgement that the full selected amount was already returned and not refunded before. Only an audited original offline receipt may use that action.

Each completion updates only the selected receipt. Original membership payment status changes to Refunded only when that original payment was refunded; refunding a renewal does not falsely refund the original payment or other renewals. A selected refunded renewal is marked Refunded so later renewal reconciliation cannot reapply it. Membership remains cancelled throughout. To refund more than one historical payment, finish the current refund, then select another still-paid receipt and request its full refund. The latest refund is summarized on the member; immutable audit events and each receipt retain earlier history. Repeated completion does not duplicate money records/audit events.

Pending/processing unreconciled renewal checkouts require review before withdrawal. Open unpaid original/renewal checkout links are expired on withdrawal. Cancelled memberships remain protected against late initial payment/renewal fulfillment and initial checkout-expired events. A changed record causes a refresh/retry instead of overwriting another payment action.

## Reports and history protection

Members has a refund-status filter and selectable Withdrawn at, Withdrawal reason, Refund status, Refund receipt, Latest refund amount and Refund reference columns. CSV/PDF use the same filters. Row icons remain compact with tooltips. The redundant Save row icon was removed; edit/maintenance retains its own Update control. Paid/refunded/waived, numbered or withdrawn memberships and records with receipts cannot be deleted through member maintenance; use withdrawal. A withdrawn membership cannot be reactivated or have payment history rewritten through the ordinary editor.

No automatic withdrawal/refund emails are sent by these actions. Use the existing member email action to communicate the decision. No real members, payments or refunds were modified in validation. This workflow supports full selected-receipt refunds, not partial refunds or self-service public requests.
