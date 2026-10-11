-- Apply before deploying tournament gender support. Existing entries remain unchanged.
alter table public.tournament_registrations add column if not exists gender text;
notify pgrst, 'reload schema';
