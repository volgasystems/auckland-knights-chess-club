-- Auckland Knights Chess Club v3.7 migration
-- Calendar title/description, linked calendar tournaments, coach image compatibility.

alter table public.club_settings add column if not exists calendar_title text default 'Calendar';
alter table public.club_settings add column if not exists calendar_description text default 'Yearly calendar of club events and general/open tournaments.';

alter table public.tournaments add column if not exists linked_tournament_id uuid;

alter table public.coaches add column if not exists image_url text;
alter table public.coaches add column if not exists is_published boolean default false;
alter table public.coaches add column if not exists display_order integer default 0;
alter table public.coaches add column if not exists updated_at timestamptz default now();

-- Keep existing coach photos compatible both ways.
update public.coaches set image_url = coalesce(image_url, photo_url) where image_url is null and photo_url is not null;
update public.coaches set photo_url = coalesce(photo_url, image_url) where photo_url is null and image_url is not null;
