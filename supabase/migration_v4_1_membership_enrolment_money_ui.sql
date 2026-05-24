-- =====================================================
-- v4.1 Calendar enrolment, configurable calendar title, and dollar-based admin fees
-- =====================================================

-- Calendar title/description are managed in club settings.
alter table public.club_settings add column if not exists calendar_title text;
alter table public.club_settings add column if not exists calendar_description text;

update public.club_settings
set calendar_title = coalesce(nullif(calendar_title, ''), extract(year from now())::text || ' Calendar'),
    calendar_description = coalesce(nullif(calendar_description, ''), 'Yearly calendar of club events and general/open tournaments.')
where id = 'default';

-- Ensure membership fields exist for club calendar event enrolment validation.
alter table public.club_memberships add column if not exists membership_id text unique;
alter table public.club_memberships add column if not exists membership_start_date date;
alter table public.club_memberships add column if not exists membership_end_date date;
alter table public.club_memberships add column if not exists membership_status text default 'pending_payment';

-- Ensure tournament registration can store membership enrolment details.
alter table public.tournament_registrations add column if not exists membership_id text;
alter table public.tournament_registrations add column if not exists is_member_registration boolean default false;
alter table public.tournament_registrations add column if not exists membership_checked_at timestamptz;

-- No database type change is required for money fields.
-- Admin now enters dollars, and the application converts dollars to cents internally for Stripe.
