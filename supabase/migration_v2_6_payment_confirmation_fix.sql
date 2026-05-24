-- =====================================================
-- v2.6 Payment Confirmation Fix
-- Auckland Knights Chess Club
-- =====================================================
-- Purpose:
-- 1. Positive-fee tournament/event registrations must remain Pending Payment
--    until Stripe checkout.session.completed confirms payment.
-- 2. Optional cleanup for any test records that were confirmed without a Stripe payment.
-- =====================================================

-- Make sure existing tournaments with a configured fee require payment.
update public.tournaments
set require_payment = true,
    updated_at = now()
where coalesce(entry_fee_cents, 0) > 0;

-- Optional cleanup: move unpaid positive-fee tournament registrations back to Pending Payment.
-- This targets records that have no Stripe payment intent but were marked as confirmed.
update public.tournament_registrations
set payment_status = 'pending_payment',
    registration_status = 'pending_payment',
    updated_at = now()
where coalesce(entry_fee_cents, category_fee_cents, 0) > 0
  and coalesce(stripe_payment_intent_id, '') = ''
  and (
    payment_status = 'paid'
    or registration_status = 'confirmed'
  );

-- Optional cleanup: move unpaid positive-fee club memberships back to Pending Payment.
update public.club_memberships
set payment_status = 'pending_payment',
    updated_at = now()
where coalesce(total_amount_cents, 0) > 0
  and coalesce(stripe_payment_intent_id, '') = ''
  and payment_status = 'paid';
