-- Run once in the Supabase SQL editor before using Payment Accounts.
create table if not exists public.payment_accounts (
 id uuid primary key default gen_random_uuid(),
 name text not null check (length(trim(name)) between 1 and 500),
 code text not null check (length(trim(code)) between 1 and 500),
 account_number text not null check (length(trim(account_number)) between 1 and 500),
 purpose text not null check (length(trim(purpose)) between 1 and 500),
 is_active boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.payment_accounts enable row level security;
-- No public policies: authenticated admin APIs use the service client after RBAC.
alter table public.tournaments add column if not exists payment_account_id uuid references public.payment_accounts(id) on delete restrict;
create index if not exists tournaments_payment_account_idx on public.tournaments(payment_account_id);
