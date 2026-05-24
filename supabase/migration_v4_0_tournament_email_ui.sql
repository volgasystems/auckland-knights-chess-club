-- =====================================================
-- v4.0 Tournament dropdowns, rating fields, images, email diagnostics
-- =====================================================

alter table public.tournaments add column if not exists rating_format text;
alter table public.tournaments add column if not exists custom_time_control text;
alter table public.tournaments add column if not exists rounds_display text;
alter table public.tournaments add column if not exists tournament_system text;
alter table public.tournaments add column if not exists rating_type text;
alter table public.tournaments add column if not exists tournament_image_url text;

-- Backfill new fields from older data where useful.
update public.tournaments
set tournament_system = coalesce(tournament_system, tournament_format)
where tournament_system is null and tournament_format is not null;

-- Optional: make old timestamp/date-time values date-only from UI perspective.
-- The columns can remain timestamptz for backwards compatibility; the application now uses date-only inputs.

create table if not exists public.email_delivery_logs (
  id uuid primary key default gen_random_uuid(),
  notice_id uuid,
  recipient_email text,
  recipient_name text,
  status text default 'new',
  error_message text,
  sent_at timestamptz,
  created_at timestamptz default now()
);


insert into storage.buckets (id, name, public)
values ('tournament-images', 'tournament-images', true)
on conflict (id) do update set public = excluded.public;

-- If you use stricter storage policies, ensure tournament-images is allowed for public select and admin upload.
