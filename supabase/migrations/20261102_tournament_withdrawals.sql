-- Run the whole file in the AKCC Supabase SQL Editor. No existing records are deleted.
begin;
alter table public.tournament_registrations
 add column if not exists withdrawn_at timestamptz,
 add column if not exists withdrawn_by uuid references public.profiles(id) on delete set null,
 add column if not exists withdrawal_reason text,
 add column if not exists refund_status text,
 add column if not exists refund_requested_cents integer,
 add column if not exists refund_completed_at timestamptz,
 add column if not exists refund_reference text;
create table if not exists public.tournament_withdrawal_audit (
 id uuid primary key default gen_random_uuid(),
 registration_id uuid not null references public.tournament_registrations(id) on delete restrict,
 action text not null,
 admin_id uuid references public.profiles(id) on delete set null,
 reason text not null,
 reference text,
 amount_cents integer not null default 0,
 created_at timestamptz not null default now()
);
alter table public.tournament_withdrawal_audit enable row level security;
revoke all on public.tournament_withdrawal_audit from anon, authenticated;
grant all on public.tournament_withdrawal_audit to service_role;
create or replace function public.manage_tournament_withdrawal(
 p_registration_id uuid,p_admin_id uuid,p_action text,p_reason text,p_reference text,
 p_refund boolean,p_expected_updated_at timestamptz
) returns jsonb language plpgsql security definer set search_path=public as $$
declare r public.tournament_registrations%rowtype; amount integer; receipt_method text;
begin
 if not exists(select 1 from public.profiles where id=p_admin_id and is_active=true and role in ('admin','super_admin')) then raise exception 'Admin approval required'; end if;
 if p_reason is null or length(trim(p_reason)) not between 5 and 1000 then raise exception 'A reason of 5-1000 characters is required'; end if;
 if p_action not in ('withdraw','request_refund','complete_offline','complete_stripe') then raise exception 'Invalid action'; end if;
 select * into strict r from public.tournament_registrations where id=p_registration_id for update;
 if p_action='withdraw' and r.withdrawn_at is not null then return to_jsonb(r); end if;
 if p_action in ('complete_offline','complete_stripe') and r.refund_status='completed' then return to_jsonb(r); end if;
 if p_action='request_refund' and r.refund_status='pending' then return to_jsonb(r); end if;
 if r.updated_at is distinct from p_expected_updated_at then raise exception 'Registration changed; refresh'; end if;
 amount=case when r.payment_status in ('paid','manual_paid','refunded') then greatest(coalesce(r.entry_fee_cents,0),0) else 0 end;
 if p_action='withdraw' then
  update public.tournament_registrations set registration_status='cancelled',withdrawn_at=now(),withdrawn_by=p_admin_id,withdrawal_reason=trim(p_reason),
   refund_status=case when r.payment_status='refunded' then 'completed' when p_refund and amount>0 then 'pending' else 'not_required' end,
   refund_requested_cents=case when p_refund or r.payment_status='refunded' then amount else 0 end,
   refund_completed_at=case when r.payment_status='refunded' then now() else null end,updated_at=now() where id=r.id returning * into r;
 elsif p_action='request_refund' then
  if r.withdrawn_at is null or r.payment_status not in ('paid','manual_paid') or amount<=0 then raise exception 'Withdraw a paid entry first'; end if;
  update public.tournament_registrations set refund_status='pending',refund_requested_cents=amount,updated_at=now() where id=r.id returning * into r;
 else
  if r.withdrawn_at is null or r.refund_status is distinct from 'pending' or coalesce(r.refund_requested_cents,0)<=0 then raise exception 'No pending refund'; end if;
  if p_reference is null or length(trim(p_reference)) not between 5 and 500 then raise exception 'Refund reference required'; end if;
  if p_action='complete_offline' then
   if r.stripe_checkout_session_id is not null or r.stripe_payment_intent_id is not null then raise exception 'Stripe refund must be verified through Stripe'; end if;
   select payment_method into receipt_method from public.payment_records where reference_id=r.id and payment_type='tournament' and status='paid' limit 1;
   if receipt_method is null or receipt_method not in ('cash','bank_transfer','verified_other') then raise exception 'Verified offline receipt required'; end if;
  else
   if r.payment_status is distinct from 'refunded' then raise exception 'Verify full Stripe refund first'; end if;
  end if;
  update public.payment_records set status='refunded' where reference_id=r.id and payment_type='tournament';
  update public.tournament_registrations set payment_status='refunded',registration_status='cancelled',refund_status='completed',refund_completed_at=now(),refund_reference=trim(p_reference),updated_at=now() where id=r.id returning * into r;
 end if;
 insert into public.tournament_withdrawal_audit(registration_id,action,admin_id,reason,reference,amount_cents)
 values(r.id,p_action,p_admin_id,trim(p_reason),nullif(trim(p_reference),''),coalesce(r.refund_requested_cents,0));
 return to_jsonb(r);
end;
$$;
revoke all on function public.manage_tournament_withdrawal(uuid,uuid,text,text,text,boolean,timestamptz) from public,anon,authenticated;
grant execute on function public.manage_tournament_withdrawal(uuid,uuid,text,text,text,boolean,timestamptz) to service_role;
notify pgrst,'reload schema';
commit;
