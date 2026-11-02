-- AKCC only: additive membership manual payment / withdrawal / refund support.
begin;
alter table public.club_memberships
 add column if not exists payment_method text,
 add column if not exists withdrawn_at timestamptz,
 add column if not exists withdrawn_by uuid references public.profiles(id) on delete set null,
 add column if not exists withdrawal_reason text,
 add column if not exists refund_status text,
 add column if not exists refund_payment_record_id uuid references public.payment_records(id) on delete restrict,
 add column if not exists refund_requested_cents integer,
 add column if not exists refund_completed_at timestamptz,
 add column if not exists refund_reference text;
alter table public.payment_records
 add column if not exists payment_method text,
 add column if not exists confirmed_by uuid references public.profiles(id) on delete set null,
 add column if not exists confirmation_note text,
 add column if not exists confirmed_at timestamptz;
create table if not exists public.membership_payment_audit (
 id uuid primary key default gen_random_uuid(),
 member_id uuid not null references public.club_memberships(id) on delete restrict,
 payment_record_id uuid references public.payment_records(id) on delete restrict,
 action text not null,admin_id uuid references public.profiles(id) on delete set null,
 reason text not null,reference text,amount_cents integer not null default 0,created_at timestamptz not null default now()
);
alter table public.membership_payment_audit enable row level security;
revoke all on public.membership_payment_audit from anon,authenticated;
grant all on public.membership_payment_audit to service_role;
create or replace function public.confirm_manual_membership_payment(p_registration_id uuid,p_admin_id uuid,p_method text,p_note text,p_expected_updated_at timestamptz)
returns jsonb language plpgsql security definer set search_path=public as $$
declare m public.club_memberships%rowtype; r public.payment_records%rowtype;
begin
 if not exists(select 1 from public.profiles where id=p_admin_id and is_active=true and role in ('admin','super_admin')) then raise exception 'Admin required'; end if;
 if p_method not in ('cash','bank_transfer','verified_other') or p_note is null or length(trim(p_note)) not between 5 and 500 then raise exception 'Method and reference required'; end if;
 select * into strict m from public.club_memberships where id=p_registration_id for update;
 select * into r from public.payment_records where id=m.id;
 if m.membership_status='cancelled' or m.withdrawn_at is not null or m.payment_status='refunded' then raise exception 'Cancelled or refunded membership'; end if;
 if m.payment_status='paid' and r.status='paid' and r.reference_id=m.id and r.payment_type='membership' and r.payment_method in ('cash','bank_transfer','verified_other') then return to_jsonb(m); end if;
 if m.payment_status not in ('pending_payment','failed','expired') or m.updated_at is distinct from p_expected_updated_at or m.total_amount_cents is null or m.total_amount_cents<=0 then raise exception 'Membership changed or not unpaid'; end if;
 if exists(select 1 from public.payment_records where reference_id=m.id and payment_type='membership' and status='paid') or r.id is not null then raise exception 'Payment already exists'; end if;
 insert into public.payment_records(id,payment_type,reference_id,email,amount_cents,status,payment_method,confirmed_by,confirmation_note,confirmed_at)
 values(m.id,'membership',m.id,m.email,m.total_amount_cents,'paid',p_method,p_admin_id,trim(p_note),now());
 update public.club_memberships set payment_status='paid',payment_method=p_method,updated_at=now() where id=m.id returning * into m;
 insert into public.membership_payment_audit(member_id,payment_record_id,action,admin_id,reason,amount_cents) values(m.id,m.id,'confirm_payment',p_admin_id,trim(p_note),m.total_amount_cents);
 return to_jsonb(m);
end;$$;
create or replace function public.manage_membership_withdrawal(p_registration_id uuid,p_admin_id uuid,p_action text,p_reason text,p_reference text,p_refund boolean,p_receipt_id uuid,p_expected_updated_at timestamptz)
returns jsonb language plpgsql security definer set search_path=public as $$
declare m public.club_memberships%rowtype; r public.payment_records%rowtype; audit_receipt uuid; amount integer=0;
begin
 if not exists(select 1 from public.profiles where id=p_admin_id and is_active=true and role in ('admin','super_admin')) then raise exception 'Admin required'; end if;
 if p_action not in ('withdraw','request_refund','complete_offline','complete_stripe') or p_reason is null or length(trim(p_reason)) not between 5 and 1000 then raise exception 'Valid action and reason required'; end if;
 select * into strict m from public.club_memberships where id=p_registration_id for update;
 if p_action='withdraw' and m.withdrawn_at is not null then return to_jsonb(m); end if;
 if p_action in ('complete_offline','complete_stripe') and m.refund_status='completed' and m.refund_payment_record_id=p_receipt_id then return to_jsonb(m); end if;
 if p_action='request_refund' and m.refund_status='pending' and m.refund_payment_record_id=p_receipt_id then return to_jsonb(m); end if;
 if m.updated_at is distinct from p_expected_updated_at then raise exception 'Membership changed; refresh'; end if;
 if p_receipt_id is not null then
  select * into strict r from public.payment_records where id=p_receipt_id and reference_id=m.id and payment_type='membership' for update;
  amount=r.amount_cents;
 end if;
 if p_action='withdraw' then
  if p_refund and (r.id is null or r.status is distinct from 'paid' or coalesce(amount,0)<=0) then raise exception 'Select a paid membership receipt'; end if;
  update public.club_memberships set membership_status='cancelled',withdrawn_at=now(),withdrawn_by=p_admin_id,withdrawal_reason=trim(p_reason),refund_status=case when p_refund then 'pending' else 'not_required' end,refund_payment_record_id=case when p_refund then r.id else null end,refund_requested_cents=case when p_refund then amount else 0 end,updated_at=now() where id=m.id returning * into m;
 elsif p_action='request_refund' then
  if m.withdrawn_at is null or m.refund_status='pending' or r.id is null or r.status is distinct from 'paid' or coalesce(amount,0)<=0 then raise exception 'Select an unrefunded paid receipt after withdrawal'; end if;
  update public.club_memberships set refund_status='pending',refund_payment_record_id=r.id,refund_requested_cents=amount,refund_completed_at=null,refund_reference=null,updated_at=now() where id=m.id returning * into m;
 else
  if m.withdrawn_at is null or m.refund_status is distinct from 'pending' or r.id is null or m.refund_payment_record_id is distinct from r.id or r.status is distinct from 'paid' or m.refund_requested_cents is distinct from amount then raise exception 'No matching pending refund'; end if;
  if p_reference is null or length(trim(p_reference)) not between 5 and 500 then raise exception 'Refund reference required'; end if;
  if p_action='complete_offline' and (r.stripe_checkout_session_id is not null or r.stripe_payment_intent_id is not null or r.payment_method is null or r.payment_method not in ('cash','bank_transfer','verified_other')) then raise exception 'Stripe or unverified payment cannot be refunded as cash'; end if;
  update public.payment_records set status='refunded' where id=r.id;
  update public.club_memberships set membership_status='cancelled',payment_status=case when r.id=m.id or (r.stripe_checkout_session_id is not null and r.stripe_checkout_session_id=m.stripe_checkout_session_id) then 'refunded' else m.payment_status end,refund_status='completed',refund_completed_at=now(),refund_reference=trim(p_reference),updated_at=now() where id=m.id returning * into m;
  -- A refunded renewal must not be reapplied by a later reconciliation.
  if to_regclass('public.membership_renewals') is not null then
   execute 'update public.membership_renewals set status=''refunded'' where id=$1 and member_id=$2' using r.id,m.id;
  end if;
 end if;
 insert into public.membership_payment_audit(member_id,payment_record_id,action,admin_id,reason,reference,amount_cents) values(m.id,case when p_action='withdraw' and not p_refund then null else r.id end,p_action,p_admin_id,trim(p_reason),nullif(trim(p_reference),''),case when p_action='withdraw' and not p_refund then 0 else amount end);
 return to_jsonb(m);
end;$$;
revoke all on function public.confirm_manual_membership_payment(uuid,uuid,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.confirm_manual_membership_payment(uuid,uuid,text,text,timestamptz) to service_role;
revoke all on function public.manage_membership_withdrawal(uuid,uuid,text,text,text,boolean,uuid,timestamptz) from public,anon,authenticated;
grant execute on function public.manage_membership_withdrawal(uuid,uuid,text,text,text,boolean,uuid,timestamptz) to service_role;
notify pgrst,'reload schema';
commit;
