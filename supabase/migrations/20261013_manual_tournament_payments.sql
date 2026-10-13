-- Run this complete file once in the AKCC Supabase SQL editor.
-- Keeps manual approval and its payment receipt in one database transaction.
begin;
alter table public.payment_records
  add column if not exists payment_method text,
  add column if not exists confirmed_by uuid references public.profiles(id) on delete set null,
  add column if not exists confirmation_note text,
  add column if not exists confirmed_at timestamptz;

create or replace function public.confirm_manual_tournament_payment(
  p_registration_id uuid, p_admin_id uuid, p_method text,
  p_note text, p_expected_updated_at timestamptz
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  r public.tournament_registrations%rowtype;
  receipt public.payment_records%rowtype;
begin
  if not exists (select 1 from public.profiles where id=p_admin_id and is_active=true and role in ('admin','super_admin')) then
    raise exception 'Admin approval required';
  end if;
  if p_method not in ('cash','bank_transfer','verified_other') or p_note is null or length(trim(p_note)) not between 5 and 500 then
    raise exception 'Payment method and reference are required';
  end if;
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
  insert into public.payment_records (id,payment_type,reference_id,email,amount_cents,status,payment_method,confirmed_by,confirmation_note,confirmed_at)
    values (r.id,'tournament',r.id,r.email,r.entry_fee_cents,'paid',p_method,p_admin_id,trim(p_note),now());
  update public.tournament_registrations set payment_status='paid',registration_status='confirmed',updated_at=now()
    where id=r.id returning * into r;
  return to_jsonb(r);
end;
$$;
revoke all on function public.confirm_manual_tournament_payment(uuid,uuid,text,text,timestamptz) from public, anon, authenticated;
grant execute on function public.confirm_manual_tournament_payment(uuid,uuid,text,text,timestamptz) to service_role;
notify pgrst, 'reload schema';
commit;
