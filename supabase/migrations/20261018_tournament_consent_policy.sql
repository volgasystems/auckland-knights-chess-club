-- Run the complete file once in the AKCC Supabase SQL editor.
-- Existing entries stay NULL: no retrospective policy acceptance/photo permission.
begin;
alter table public.tournaments add column if not exists cancellation_refund_policy text;
alter table public.tournament_registrations
 add column if not exists cancellation_policy_snapshot text,
 add column if not exists cancellation_policy_accepted_at timestamptz,
 add column if not exists photo_consent boolean,
 add column if not exists photo_consent_notice text,
 add column if not exists photo_consent_recorded_at timestamptz,
 add column if not exists photo_consent_by text,
 add column if not exists photo_consent_role text,
 add column if not exists photo_child_agreement boolean;
-- All public lists/exports already read a safe projection through server routes.
-- Do not expose private registration and consent records directly to browser roles.
revoke select on public.tournament_registrations from public, anon, authenticated;
drop policy if exists "Public read paid entries" on public.tournament_registrations;
notify pgrst, 'reload schema';
commit;
