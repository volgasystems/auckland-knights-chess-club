-- Auckland Knights Chess Club v3.6 migration
-- Membership IDs, calendar membership validation, prize rows, notices, templates and bulk email.

-- Roles
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('super_admin','admin','news_editor','tournament_manager','gallery_manager','faq_manager','coaching_manager','social_media_manager','communications_manager','member'));

-- Settings for notices
alter table public.club_settings add column if not exists notice_from_email text;
alter table public.club_settings add column if not exists notice_reply_to_email text;
alter table public.club_settings add column if not exists notice_sender_name text default 'Auckland Knights Chess Club';

-- Membership ID and validity
alter table public.club_memberships add column if not exists membership_id text unique;
alter table public.club_memberships add column if not exists membership_start_date date;
alter table public.club_memberships add column if not exists membership_end_date date;
alter table public.club_memberships add column if not exists membership_status text default 'pending_payment';
alter table public.club_memberships add column if not exists renewal_notice_sent_at timestamptz;

-- Membership options validity configuration
alter table public.membership_options add column if not exists validity_months int default 12;
alter table public.membership_options add column if not exists valid_until_month int default 12;

-- Tournament type and prize rows
alter table public.tournaments add column if not exists tournament_type text default 'general_open';
alter table public.tournaments add column if not exists tournament_prizes jsonb default '[]'::jsonb;

-- Calendar registration membership tracking
alter table public.tournament_registrations add column if not exists membership_id text;
alter table public.tournament_registrations add column if not exists is_member_registration boolean default false;
alter table public.tournament_registrations add column if not exists membership_checked_at timestamptz;

-- Membership ID sequence and helper
create sequence if not exists membership_id_seq start with 1001 increment by 1;
create or replace function public.generate_membership_id()
returns text as $$
  select 'AK' || lpad(nextval('membership_id_seq')::text, 5, '0');
$$ language sql;

-- Email templates and notice history
create table if not exists public.email_templates (
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

create table if not exists public.member_notices (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  target_group text not null default 'active',
  template_id uuid references public.email_templates(id) on delete set null,
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

create table if not exists public.email_delivery_logs (
  id uuid primary key default gen_random_uuid(),
  notice_id uuid references public.member_notices(id) on delete cascade,
  recipient_email text not null,
  recipient_name text,
  status text default 'queued' check (status in ('queued','sent','failed','skipped')),
  error_message text,
  sent_at timestamptz,
  created_at timestamptz default now()
);

alter table public.email_templates enable row level security;
alter table public.member_notices enable row level security;
alter table public.email_delivery_logs enable row level security;

drop policy if exists "Admin read email templates" on public.email_templates;
create policy "Admin read email templates" on public.email_templates for select using (true);

insert into public.email_templates (template_key, name, subject, body, is_active) values
('membership_confirmation','Membership Confirmation','Welcome to Auckland Knights Chess Club - {{membership_id}}','Hi {{first_name}},\n\nThank you for joining Auckland Knights Chess Club. Your membership ID is {{membership_id}}.\nMembership valid from {{membership_start_date}} to {{membership_end_date}}.\n\nRegards,\nAuckland Knights Chess Club', true),
('renewal_reminder','Membership Renewal Reminder','Auckland Knights membership renewal reminder','Hi {{first_name}},\n\nYour Auckland Knights Chess Club membership {{membership_id}} is due for renewal.\nExpiry date: {{membership_end_date}}\n\nPlease renew to continue joining club calendar events.\n\nRegards,\nAuckland Knights Chess Club', true),
('expired_notice','Membership Expired Notice','Auckland Knights membership expired','Hi {{first_name}},\n\nYour Auckland Knights Chess Club membership {{membership_id}} has expired. Please renew for the new year.\n\nRegards,\nAuckland Knights Chess Club', true),
('calendar_registration','Calendar Event Registration Confirmation','Calendar event registration confirmed','Hi {{first_name}},\n\nYour registration for {{tournament_name}} is confirmed using membership {{membership_id}}.\n\nRegards,\nAuckland Knights Chess Club', true),
('general_tournament_paid','Tournament Payment Confirmation','Tournament registration confirmed','Hi {{first_name}},\n\nYour registration for {{tournament_name}} is confirmed after payment.\n\nRegards,\nAuckland Knights Chess Club', true),
('club_notice','Club Notice','Auckland Knights Club Notice','Hi {{first_name}},\n\n{{message}}\n\nRegards,\nAuckland Knights Chess Club', true)
on conflict (template_key) do nothing;

-- Social post to news option
alter table public.social_posts add column if not exists publish_as_news boolean default false;

alter table public.member_notices add column if not exists created_by uuid;
