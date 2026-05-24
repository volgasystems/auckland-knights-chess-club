-- Auckland Knights Chess Club v2.5 migration
-- Run this if you already have an existing Supabase database and do not want to reset all data.

alter table if exists public.profiles drop constraint if exists profiles_role_check;
alter table if exists public.profiles add constraint profiles_role_check check (role in ('super_admin','admin','news_editor','tournament_manager','gallery_manager','faq_manager','coaching_manager','social_media_manager','member'));

alter table if exists public.club_settings add column if not exists status text default 'draft';
alter table if exists public.club_settings add column if not exists is_published boolean default false;

alter table if exists public.news_posts add column if not exists publish_to_social boolean default false;
alter table if exists public.news_posts add column if not exists social_platforms jsonb default '[]'::jsonb;

alter table if exists public.tournaments add column if not exists show_in_calendar boolean default true;
alter table if exists public.tournaments add column if not exists publish_to_social boolean default false;
alter table if exists public.tournaments add column if not exists social_platforms jsonb default '[]'::jsonb;

alter table if exists public.tournament_registrations add column if not exists street_address text;
alter table if exists public.tournament_registrations add column if not exists suburb text;
alter table if exists public.tournament_registrations add column if not exists city text;
alter table if exists public.tournament_registrations add column if not exists postcode text;

create table if not exists public.membership_options (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  name text not null,
  description text,
  fee_cents int not null default 0,
  joining_period text,
  display_order int default 0,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  post_type text default 'custom' check (post_type in ('news','result','custom','tournament')),
  source_table text,
  source_id uuid,
  message text not null,
  image_url text,
  website_url text,
  platforms jsonb default '[]'::jsonb,
  status text default 'draft' check (status in ('draft','ready','posted','failed')),
  posted_at timestamptz,
  created_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.live_board_links (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  tournament_name text,
  year int,
  date_display text,
  vega_url text,
  lichess_url text,
  embed_url text,
  status text default 'current' check (status in ('current','recent','archived')),
  display_order int default 0,
  is_published boolean default false,
  created_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table if exists public.membership_options enable row level security;
alter table if exists public.social_posts enable row level security;
alter table if exists public.live_board_links enable row level security;

drop policy if exists "Public read active membership options" on public.membership_options;
create policy "Public read active membership options" on public.membership_options for select using (is_active = true);
drop policy if exists "Public read live boards" on public.live_board_links;
create policy "Public read live boards" on public.live_board_links for select using (is_published = true);

insert into public.membership_options (key, name, description, fee_cents, joining_period, display_order, is_active) values
('school_pupil', 'School Pupil Membership', 'Junior and senior club option for school pupils.', 7500, 'Current calendar year', 1, true),
('school_pupil_term3', 'School Pupil Membership - joining after Term 3', 'Reduced fee for school pupils joining later in the year.', 5000, 'After Term 3', 2, true),
('individual', 'Individual Member', 'For tertiary students and adults who want to join club chess activities.', 12000, 'Current calendar year', 3, true),
('individual_after_july', 'Individual Member - joining after 1 July', 'Reduced fee for individual members joining later in the year.', 9000, 'After 1 July', 4, true),
('associate', 'Associate Member', 'For players wanting limited club participation.', 6000, 'Current calendar year', 5, true)
on conflict (key) do nothing;
