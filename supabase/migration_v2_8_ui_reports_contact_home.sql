-- Auckland Knights Chess Club v2.8 migration
-- Adds contact enquiry storage used by the public Contact Us form.

create table if not exists public.contact_enquiries (
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

alter table public.contact_enquiries enable row level security;
