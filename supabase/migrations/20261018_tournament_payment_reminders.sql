begin;
alter table public.tournaments add column if not exists payment_reminders_enabled boolean not null default true;
alter table public.tournament_registrations add column if not exists payment_reminder_sent_at timestamptz;
alter table public.tournament_registrations add column if not exists payment_reminder_claimed_at timestamptz;
alter table public.tournament_registrations add column if not exists payment_pending_reason text;
create index if not exists tournament_pending_reminders_idx on public.tournament_registrations(payment_reminder_sent_at,created_at) where payment_status in ('pending_payment','failed','expired');
notify pgrst, 'reload schema';
commit;
