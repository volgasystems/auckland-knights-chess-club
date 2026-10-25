-- AKCC only. Run the entire file in Supabase SQL Editor, then refresh Payment Accounts.
-- Additive and idempotent; no existing registrations/payments are removed or marked paid.
begin;
alter table public.payment_accounts
 add column if not exists name text,
 add column if not exists account_name text,
 add column if not exists use_for_membership boolean not null default false,
 add column if not exists use_for_tournaments boolean not null default false;
update public.payment_accounts set name=coalesce(nullif(trim(name),''),account_name), account_name=coalesce(nullif(trim(name),''),account_name);
create or replace function public.sync_payment_account_names() returns trigger language plpgsql set search_path=public as $$
begin
 if TG_OP='UPDATE' and new.account_name is distinct from old.account_name and new.name is not distinct from old.name then new.name=new.account_name;
 else new.name=coalesce(nullif(trim(new.name),''),new.account_name); new.account_name=new.name; end if;
 return new;
end;
$$;
drop trigger if exists sync_payment_account_names on public.payment_accounts;
create trigger sync_payment_account_names before insert or update on public.payment_accounts for each row execute function public.sync_payment_account_names();
create unique index if not exists payment_accounts_one_membership_default on public.payment_accounts(use_for_membership) where use_for_membership=true and is_active=true;
create unique index if not exists payment_accounts_one_tournament_default on public.payment_accounts(use_for_tournaments) where use_for_tournaments=true and is_active=true;
alter table public.club_memberships
 add column if not exists payment_method text,
 add column if not exists bank_account_snapshot jsonb,
 add column if not exists payment_reference text;
alter table public.tournament_registrations
 add column if not exists payment_method text,
 add column if not exists bank_account_snapshot jsonb,
 add column if not exists payment_reference text;
create unique index if not exists membership_transfer_reference on public.club_memberships(payment_reference) where payment_reference is not null;
create unique index if not exists tournament_transfer_reference on public.tournament_registrations(payment_reference) where payment_reference is not null;
alter table public.payment_records
 add column if not exists payment_method text,
 add column if not exists confirmed_by uuid references public.profiles(id) on delete set null,
 add column if not exists confirmation_note text,
 add column if not exists confirmed_at timestamptz;
create or replace function public.confirm_bank_membership_payment(p_registration_id uuid,p_admin_id uuid,p_note text,p_expected_updated_at timestamptz)
returns jsonb language plpgsql security definer set search_path=public as $$
declare m public.club_memberships%rowtype; receipt public.payment_records%rowtype;
begin
 if not exists(select 1 from public.profiles where id=p_admin_id and is_active=true and role in ('admin','super_admin')) then raise exception 'Admin approval required'; end if;
 if p_note is null or length(trim(p_note)) not between 5 and 500 then raise exception 'Payment reference required'; end if;
 select * into strict m from public.club_memberships where id=p_registration_id for update;
 select * into receipt from public.payment_records where id=p_registration_id;
 if m.payment_method is distinct from 'bank_transfer' or m.stripe_checkout_session_id is not null or m.membership_status='cancelled' or m.payment_status='refunded' then raise exception 'Only bank-transfer memberships can be approved here'; end if;
 if m.payment_status='paid' and receipt.status='paid' and receipt.payment_type='membership' and receipt.reference_id=m.id and receipt.payment_method='bank_transfer' then return to_jsonb(m); end if;
 if m.payment_status not in ('pending_payment','failed','expired') or m.updated_at is distinct from p_expected_updated_at or receipt.id is not null or m.total_amount_cents is null or m.total_amount_cents<=0 then raise exception 'Membership changed or payment exists'; end if;
 insert into public.payment_records(id,payment_type,reference_id,email,amount_cents,status,payment_method,confirmed_by,confirmation_note,confirmed_at)
 values(m.id,'membership',m.id,m.email,m.total_amount_cents,'paid','bank_transfer',p_admin_id,trim(p_note),now());
 update public.club_memberships set payment_status='paid',updated_at=now() where id=m.id returning * into m;
 return to_jsonb(m);
end;
$$;
revoke all on function public.confirm_bank_membership_payment(uuid,uuid,text,timestamptz) from public,anon,authenticated;
grant execute on function public.confirm_bank_membership_payment(uuid,uuid,text,timestamptz) to service_role;
create or replace function public.confirm_manual_tournament_payment(
  p_registration_id uuid, p_admin_id uuid, p_method text,
  p_note text, p_expected_updated_at timestamptz
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  r public.tournament_registrations%rowtype;
  receipt public.payment_records%rowtype;
  t public.tournaments%rowtype;
begin
  if not exists (select 1 from public.profiles where id=p_admin_id and is_active=true and role in ('admin','super_admin')) then
    raise exception 'Admin approval required';
  end if;
  if p_method not in ('cash','bank_transfer','verified_other') or p_note is null or length(trim(p_note)) not between 5 and 500 then
    raise exception 'Payment method and reference are required';
  end if;
  select * into strict r from public.tournament_registrations where id=p_registration_id;
  select * into strict t from public.tournaments where id=r.tournament_id for update;
  select * into strict r from public.tournament_registrations where id=p_registration_id for update;
  select * into receipt from public.payment_records where id=p_registration_id;
  if r.payment_status='paid' and r.registration_status='confirmed' and receipt.status='paid' and receipt.payment_type='tournament' and receipt.reference_id=r.id and receipt.payment_method in ('cash','bank_transfer','verified_other') then
    return to_jsonb(r); -- Retry does not create a second payment or alter the audit.
  end if;
  if r.payment_status not in ('pending_payment','failed','expired') or r.registration_status='cancelled' then
    raise exception 'Only pending unpaid entries can be manually confirmed';
  end if;
  if r.updated_at is distinct from p_expected_updated_at then
    raise exception 'Registration changed; refresh and try again';
  end if;
  if r.entry_fee_cents is null or r.entry_fee_cents <= 0 then
    raise exception 'A positive entry fee is required';
  end if;
  if receipt.id is not null then
    raise exception 'A payment record already exists; verify it before approving';
  end if;
  if t.max_players is not null and (select count(*) from public.tournament_registrations where tournament_id=t.id and payment_status='paid' and registration_status='confirmed') >= t.max_players then raise exception 'Tournament is full'; end if;
  if exists(select 1 from public.tournament_registrations where tournament_id=t.id and id<>r.id and payment_status='paid' and registration_status='confirmed' and lower(trim(first_name))=lower(trim(r.first_name)) and lower(trim(last_name))=lower(trim(r.last_name)) and date_of_birth=r.date_of_birth) then raise exception 'Player already confirmed'; end if;
  insert into public.payment_records (id,payment_type,reference_id,email,amount_cents,status,payment_method,confirmed_by,confirmation_note,confirmed_at)
    values (r.id,'tournament',r.id,r.email,r.entry_fee_cents,'paid',p_method,p_admin_id,trim(p_note),now());
  update public.tournament_registrations set payment_status='paid',registration_status='confirmed',updated_at=now()
    where id=r.id returning * into r;
  return to_jsonb(r);
end;
$$;
revoke all on function public.confirm_manual_tournament_payment(uuid,uuid,text,text,timestamptz) from public, anon, authenticated;
grant execute on function public.confirm_manual_tournament_payment(uuid,uuid,text,text,timestamptz) to service_role;
create unique index if not exists membership_one_pending_bank on public.club_memberships(lower(email),lower(first_name),lower(last_name),date_of_birth) where payment_method='bank_transfer' and payment_status='pending_payment';
create unique index if not exists tournament_one_pending_bank on public.tournament_registrations(tournament_id,lower(email),lower(first_name),lower(last_name),date_of_birth) where payment_method='bank_transfer' and payment_status='pending_payment';
notify pgrst, 'reload schema';
commit;
