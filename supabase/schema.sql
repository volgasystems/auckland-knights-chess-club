-- Auckland Knights Chess Club Supabase schema
-- Run this in Supabase SQL Editor after creating a new project.

create extension if not exists pgcrypto;

-- Profiles for private admin/staff login only. Public club membership does not create login.
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  first_name text,
  last_name text,
  full_name text,
  phone text,
  role text not null default 'member' check (role in ('super_admin','admin','news_editor','tournament_manager','gallery_manager','faq_manager','coaching_manager','social_media_manager','communications_manager','member')),
  is_active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, first_name, last_name, full_name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'first_name', new.raw_user_meta_data->>'last_name', coalesce(new.raw_user_meta_data->>'full_name',''), 'member')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table if not exists club_settings (
  id text primary key default 'default',
  club_name text default 'Auckland Knights Chess Club',
  club_address text default 'East Auckland / South Auckland, New Zealand',
  general_email text default 'info@aucklandknights.co.nz',
  club_captain_name text,
  club_captain_phone text,
  club_captain_email text,
  senior_club_captain_name text,
  senior_club_captain_phone text,
  senior_club_captain_email text,
  junior_club_captain_name text,
  junior_club_captain_phone text,
  junior_club_captain_email text,
  junior_contact_name text,
  junior_contact_phone text,
  junior_contact_email text,
  live_boards_url text,
  facebook_url text,
  instagram_url text,
  youtube_url text,
  lichess_url text,
  x_url text,
  linkedin_url text,
  notice_from_email text,
  notice_reply_to_email text,
  notice_sender_name text default 'Auckland Knights Chess Club',
  membership_id_prefix text default 'AKCC',
  email_provider text default 'smtp',
  resend_api_key text,
  smtp_host text default 'smtp-relay.brevo.com',
  smtp_port int default 587,
  smtp_secure boolean default false,
  smtp_user text,
  smtp_pass text,
  club_from_email text,
  club_from_name text default 'Auckland Knights Chess Club',
  club_reply_to_email text,
  calendar_title text default 'Calendar',
  calendar_description text default 'Yearly calendar of club events and general/open tournaments.',
  status text default 'draft' check (status in ('draft','published')),
  is_published boolean default false,
  main_club_schedule text,
  junior_club_schedule text,
  created_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
insert into club_settings (id) values ('default') on conflict (id) do nothing;

create table if not exists news_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  summary text,
  content text not null,
  image_url text,
  publish_to_social boolean default false,
  social_platforms jsonb default '[]'::jsonb,
  is_published boolean default false,
  published_at timestamptz,
  created_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists tournaments (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  description text,
  tournament_year int,
  show_in_calendar boolean default true,
  linked_tournament_id uuid,
  date_display text,
  start_date timestamptz,
  end_date timestamptz,
  venue_name text,
  venue_address text,
  venue text,
  rating_format text,
  time_control text,
  custom_time_control text,
  rounds_display text,
  rounds int,
  tournament_system text,
  rating_type text,
  tournament_format text,
  tournament_image_url text,
  entry_fee_cents int default 0,
  category_options jsonb default '[]'::jsonb,
  tournament_prizes jsonb default '[]'::jsonb,
  tournament_type text default 'general_open' check (tournament_type in ('club_calendar','general_open')),
  max_players int default 0,
  registration_open_at timestamptz,
  registration_close_at timestamptz,
  status text default 'draft' check (status in ('draft','open','closed','completed','archived')),
  allow_public_registration boolean default false,
  allow_non_members boolean default true,
  require_payment boolean default true,
  show_public_entries boolean default true,
  vega_url text,
  lichess_url text,
  pgn_url text,
  winner_photo_url text,
  first_place_name text,
  second_place_name text,
  third_place_name text,
  result_summary text,
  prize_details text,
  publish_to_social boolean default false,
  social_platforms jsonb default '[]'::jsonb,
  created_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists club_memberships (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,
  date_of_birth date,
  gender text,
  street_address text,
  suburb text,
  city text,
  postcode text,
  nzcf_id text,
  nzcf_rating int,
  fide_id text,
  fide_rating int,
  parent_guardian_phone text,
  parent_guardian_first_name text,
  parent_guardian_last_name text,
  school text,
  date_payment_made date,
  membership_options jsonb default '[]'::jsonb,
  total_amount_cents int default 0,
  payment_status text default 'pending_payment' check (payment_status in ('pending_payment','paid','failed','expired','refunded')),
  membership_id text unique,
  membership_start_date date,
  membership_end_date date,
  membership_status text default 'pending_payment' check (membership_status in ('pending_payment','active','expired','cancelled')),
  renewal_notice_sent_at timestamptz,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists tournament_registrations (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references tournaments(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,
  date_of_birth date,
  nzcf_id text,
  nzcf_rating int,
  fide_id text,
  fide_rating int,
  club_name text,
  school_name text,
  parent_guardian_name text,
  parent_guardian_phone text,
  street_address text,
  suburb text,
  city text,
  postcode text,
  tournament_image_url text,
  entry_fee_cents int default 0,
  category_key text,
  category_name text,
  category_fee_cents int,
  category_prize_text text,
  membership_id text,
  is_member_registration boolean default false,
  membership_checked_at timestamptz,
  payment_status text default 'pending_payment' check (payment_status in ('pending_payment','paid','failed','expired','refunded')),
  registration_status text default 'pending_payment' check (registration_status in ('pending_payment','confirmed','cancelled','expired')),
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists absences (
  id uuid primary key default gen_random_uuid(),
  player_first_name text not null,
  player_last_name text not null,
  parent_guardian_name text,
  email text not null,
  phone text,
  tournament_name text not null,
  round_number text not null,
  round_date date not null,
  reason text not null,
  notes text,
  status text default 'new' check (status in ('new','reviewed','noted')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists gallery_photos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  event_date date,
  image_url text not null,
  is_published boolean default false,
  created_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  display_order int default 0,
  is_published boolean default false,
  created_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists coaches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  title text,
  bio text,
  experience text,
  specialisation text,
  email text,
  phone text,
  photo_url text,
  image_url text,
  booking_link text,
  availability text,
  display_order int default 0,
  is_published boolean default false,
  created_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists coaching_topics (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  topic_date date,
  skill_level text,
  description text,
  coach_id uuid references coaches(id) on delete set null,
  join_link text,
  is_published boolean default false,
  created_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists agm_meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  meeting_date date,
  venue text,
  summary text,
  attachment_url text,
  is_published boolean default false,
  created_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists agm_decisions (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid references agm_meetings(id) on delete cascade,
  title text not null,
  description text,
  proposed_by text,
  seconded_by text,
  outcome text default 'Approved',
  action_owner text,
  due_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists elected_team_members (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid references agm_meetings(id) on delete cascade,
  role_title text not null,
  person_name text not null,
  email text,
  phone text,
  term_start date,
  term_end date,
  notes text,
  display_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);


create table if not exists membership_options (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  name text not null,
  description text,
  fee_cents int not null default 0,
  joining_period text,
  display_order int default 0,
  validity_months int default 12,
  valid_until_month int default 12,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists social_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  post_type text default 'custom' check (post_type in ('news','result','custom','tournament')),
  source_table text,
  source_id uuid,
  message text not null,
  image_url text,
  website_url text,
  platforms jsonb default '[]'::jsonb,
  publish_as_news boolean default false,
  status text default 'draft' check (status in ('draft','ready','posted','failed')),
  posted_at timestamptz,
  created_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists live_board_links (
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

create table if not exists email_templates (
  id uuid primary key default gen_random_uuid(),
  template_key text unique not null,
  name text not null,
  subject text not null,
  body text not null,
  is_active boolean default true,
  created_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists member_notices (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  target_group text not null default 'active',
  template_id uuid references email_templates(id) on delete set null,
  subject text not null,
  body text not null,
  recipient_count int default 0,
  status text default 'draft' check (status in ('draft','sent','failed')),
  sent_by uuid,
  created_by uuid,
  sent_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists email_delivery_logs (
  id uuid primary key default gen_random_uuid(),
  notice_id uuid references member_notices(id) on delete cascade,
  recipient_email text not null,
  recipient_name text,
  status text default 'queued' check (status in ('queued','sent','failed','skipped')),
  error_message text,
  sent_at timestamptz,
  created_at timestamptz default now()
);

create sequence if not exists membership_id_seq start with 1001 increment by 1;
create or replace function public.generate_membership_id()
returns text as $$
  select 'AK' || lpad(nextval('membership_id_seq')::text, 5, '0');
$$ language sql;

create table if not exists payment_records (
  id uuid primary key default gen_random_uuid(),
  payment_type text not null check (payment_type in ('membership','tournament')),
  reference_id uuid,
  email text,
  amount_cents int default 0,
  status text default 'paid',
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  created_at timestamptz default now()
);

create table if not exists contact_enquiries (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text,
  enquiry_type text default 'General enquiry',
  subject text not null,
  message text not null,
  status text default 'new' check (status in ('new','in_progress','responded','closed')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Storage buckets for uploaded/cropped images.
insert into storage.buckets (id, name, public) values
  ('news-images','news-images',true),
  ('winner-images','winner-images',true),
  ('tournament-images','tournament-images',true),
  ('gallery-images','gallery-images',true),
  ('coach-images','coach-images',true),
  ('agm-files','agm-files',true)
on conflict (id) do update set public = true;

-- Basic RLS. App uses server-side service-role routes for writes.
alter table profiles enable row level security;
alter table club_settings enable row level security;
alter table news_posts enable row level security;
alter table tournaments enable row level security;
alter table club_memberships enable row level security;
alter table tournament_registrations enable row level security;
alter table absences enable row level security;
alter table gallery_photos enable row level security;
alter table faqs enable row level security;
alter table coaches enable row level security;
alter table coaching_topics enable row level security;
alter table agm_meetings enable row level security;
alter table agm_decisions enable row level security;
alter table elected_team_members enable row level security;
alter table membership_options enable row level security;
alter table social_posts enable row level security;
alter table live_board_links enable row level security;
alter table email_templates enable row level security;
alter table member_notices enable row level security;
alter table email_delivery_logs enable row level security;
alter table payment_records enable row level security;
alter table contact_enquiries enable row level security;


drop policy if exists "Public read published news" on news_posts;
create policy "Public read published news" on news_posts for select using (is_published = true);
drop policy if exists "Public read tournaments" on tournaments;
create policy "Public read tournaments" on tournaments for select using (true);
drop policy if exists "Public read paid entries" on tournament_registrations;
create policy "Public read paid entries" on tournament_registrations for select using (payment_status='paid' and registration_status='confirmed');
drop policy if exists "Public read gallery" on gallery_photos;
create policy "Public read gallery" on gallery_photos for select using (is_published = true);
drop policy if exists "Public read faqs" on faqs;
create policy "Public read faqs" on faqs for select using (is_published = true);
drop policy if exists "Public read coaches" on coaches;
create policy "Public read coaches" on coaches for select using (is_published = true);
drop policy if exists "Public read topics" on coaching_topics;
create policy "Public read topics" on coaching_topics for select using (is_published = true);
drop policy if exists "Public read agm" on agm_meetings;
create policy "Public read agm" on agm_meetings for select using (is_published = true);
drop policy if exists "Public read agm decisions" on agm_decisions;
create policy "Public read agm decisions" on agm_decisions for select using (true);
drop policy if exists "Public read elected team" on elected_team_members;
create policy "Public read elected team" on elected_team_members for select using (true);
drop policy if exists "Public read club settings" on club_settings;
create policy "Public read club settings" on club_settings for select using (true);
drop policy if exists "Public read active membership options" on membership_options;
create policy "Public read active membership options" on membership_options for select using (is_active = true);
drop policy if exists "Admin read email templates" on email_templates;
create policy "Admin read email templates" on email_templates for select using (true);
drop policy if exists "Public read live boards" on live_board_links;
create policy "Public read live boards" on live_board_links for select using (is_published = true);
drop policy if exists "Public image access" on storage.objects;
create policy "Public image access" on storage.objects for select using (bucket_id in ('news-images','winner-images','tournament-images','gallery-images','coach-images','agm-files'));


insert into membership_options (key, name, description, fee_cents, joining_period, display_order, is_active) values
('school_pupil', 'School Pupil Membership', 'Junior and senior club option for school pupils.', 7500, 'Current calendar year', 1, true),
('school_pupil_term3', 'School Pupil Membership - joining after Term 3', 'Reduced fee for school pupils joining later in the year.', 5000, 'After Term 3', 2, true),
('individual', 'Individual Member', 'For tertiary students and adults who want to join club chess activities.', 12000, 'Current calendar year', 3, true),
('individual_after_july', 'Individual Member - joining after 1 July', 'Reduced fee for individual members joining later in the year.', 9000, 'After 1 July', 4, true),
('associate', 'Associate Member', 'For players wanting limited club participation.', 6000, 'Current calendar year', 5, true)
on conflict (key) do nothing;


insert into email_templates (template_key, name, subject, body, is_active) values
('membership_confirmation','Membership Confirmation','Welcome to Auckland Knights Chess Club - {{membership_id}}','Hi {{first_name}},

Thank you for joining Auckland Knights Chess Club. Your membership ID is {{membership_id}}.
Membership valid from {{membership_start_date}} to {{membership_end_date}}.

Regards,
Auckland Knights Chess Club', true),
('renewal_reminder','Membership Renewal Reminder','Auckland Knights membership renewal reminder','Hi {{first_name}},

Your Auckland Knights Chess Club membership {{membership_id}} is due for renewal.
Expiry date: {{membership_end_date}}

Please renew to continue joining club calendar events.

Regards,
Auckland Knights Chess Club', true),
('expired_notice','Membership Expired Notice','Auckland Knights membership expired','Hi {{first_name}},

Your Auckland Knights Chess Club membership {{membership_id}} has expired. Please renew for the new year.

Regards,
Auckland Knights Chess Club', true),
('calendar_registration','Calendar Event Registration Confirmation','Calendar event registration confirmed','Hi {{first_name}},

Your registration for {{tournament_name}} is confirmed using membership {{membership_id}}.

Regards,
Auckland Knights Chess Club', true),
('general_tournament_paid','Tournament Payment Confirmation','Tournament registration confirmed','Hi {{first_name}},

Your registration for {{tournament_name}} is confirmed after payment.

Regards,
Auckland Knights Chess Club', true),
('club_notice','Club Notice','Auckland Knights Club Notice','Hi {{first_name}},

{{message}}

Regards,
Auckland Knights Chess Club', true)
on conflict (template_key) do nothing;

-- Seed useful FAQ examples.
insert into faqs (question, answer, display_order, is_published) values
('Who can join Auckland Knights Chess Club?', 'Players of different ages and levels are welcome. Junior players should know how chess pieces move and capture.', 1, true),
('Do I need a FIDE ID?', 'No. A FIDE ID is helpful for rated tournaments but not required for general club membership.', 2, true),
('How do I register for tournaments?', 'Open tournaments will appear on the Tournaments page with a Register button.', 3, true),
('How do I report absence for a round?', 'Use the public Report Absence form and include the tournament name, round number and round date.', 4, true)
on conflict do nothing;

-- Configurable, transactional membership numbering (v4.4).
-- Apply once in the production Supabase SQL editor; existing IDs are retained.
begin;
alter table public.club_settings add column if not exists membership_id_start bigint not null default 1001;
alter table public.club_settings add column if not exists membership_id_next bigint not null default 1001;
alter table public.club_settings add column if not exists membership_id_digits integer not null default 5;

create or replace function public.configure_membership_numbering(p_prefix text, p_start bigint, p_digits integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare highest bigint; next_number bigint; settings public.club_settings%rowtype;
begin
  p_prefix := upper(trim(p_prefix));
  if p_prefix is null or p_start is null or p_digits is null or p_prefix !~ '^[A-Z][A-Z0-9-]{0,11}$' or p_start < 1 or p_start > 999999999 or p_digits < 1 or p_digits > 9 then
    raise exception 'Use a 1–12 character prefix, a start number from 1 to 999999999, and 1–9 digits';
  end if;
  select * into strict settings from public.club_settings where id = 'default' for update;
  select coalesce(max(substring(membership_id from length(p_prefix)+1)::bigint), 0) into highest
  from public.club_memberships where left(membership_id, length(p_prefix)) = p_prefix
    and substring(membership_id from length(p_prefix)+1) ~ '^[0-9]{1,9}$';
  next_number := greatest(p_start, highest+1, case when settings.membership_id_prefix = p_prefix then settings.membership_id_next else 1 end);
  if next_number > 999999999 then raise exception 'Membership sequence is exhausted'; end if;
  update public.club_settings set membership_id_prefix = p_prefix, membership_id_start = p_start,
    membership_id_next = next_number, membership_id_digits = p_digits, updated_at = now() where id = 'default';
  return jsonb_build_object('prefix', p_prefix, 'start', p_start, 'next', next_number, 'digits', p_digits);
end;
$$;

create or replace function public.assign_membership_id(p_member_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare settings public.club_settings%rowtype; member public.club_memberships%rowtype; candidate text; n bigint;
begin
  -- Always lock configuration first, then the member, for replay/concurrency safety.
  select * into strict settings from public.club_settings where id = 'default' for update;
  select * into strict member from public.club_memberships where id = p_member_id for update;
  if nullif(member.membership_id, '') is not null then return member.membership_id; end if;
  if member.payment_status not in ('paid','manual_paid','waived') then raise exception 'Membership is not paid'; end if;
  n := greatest(settings.membership_id_next, settings.membership_id_start);
  loop
    if n > 999999999 then raise exception 'Membership sequence is exhausted'; end if;
    candidate := settings.membership_id_prefix || lpad(n::text, greatest(settings.membership_id_digits, length(n::text)), '0');
    exit when not exists(select 1 from public.club_memberships where membership_id = candidate);
    n := n + 1;
  end loop;
  update public.club_memberships set membership_id = candidate, updated_at = now() where id = p_member_id;
  update public.club_settings set membership_id_next = n + 1 where id = 'default';
  return candidate;
end;
$$;

-- Do not expose sequence changes or member-ID allocation to public clients.
revoke all on function public.configure_membership_numbering(text,bigint,integer) from public, anon, authenticated;
revoke all on function public.assign_membership_id(uuid) from public, anon, authenticated;
grant execute on function public.configure_membership_numbering(text,bigint,integer) to service_role;
grant execute on function public.assign_membership_id(uuid) to service_role;

select public.configure_membership_numbering(
  coalesce(nullif(membership_id_prefix, ''), 'AKCC'), membership_id_start, membership_id_digits
) from public.club_settings where id = 'default';
commit;

-- Add event albums while retaining every existing photo and publication status.
begin;
alter table public.gallery_photos add column if not exists event_name text;
create index if not exists gallery_photos_event_album_idx on public.gallery_photos(event_name, event_date);
commit;
