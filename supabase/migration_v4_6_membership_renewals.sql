begin;
create table if not exists public.membership_renewals (
 id uuid primary key default gen_random_uuid(),
 member_id uuid not null references public.club_memberships(id),
 option_key text not null, option_name text not null,
 amount_cents integer not null check(amount_cents > 0),
 validity_months integer not null default 12 check(validity_months between 1 and 120),
 valid_until_month integer check(valid_until_month between 1 and 12),
 status text not null default 'pending_payment' check(status in ('pending_payment','paid','failed','expired','refunded')),
 stripe_checkout_session_id text unique,
 stripe_payment_intent_id text,
 starts_on date, ends_on date,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index if not exists membership_one_pending_renewal on public.membership_renewals(member_id) where status = 'pending_payment';
alter table public.membership_renewals enable row level security;
revoke all on public.membership_renewals from anon, authenticated;
grant all on public.membership_renewals to service_role;
create or replace function public.apply_membership_renewal(p_renewal_id uuid, p_session_id text, p_payment_intent text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare r public.membership_renewals%rowtype; m public.club_memberships%rowtype; start_day date; end_day date; nz_today date; end_year integer;
begin
 select * into strict r from public.membership_renewals where id=p_renewal_id for update;
 select * into strict m from public.club_memberships where id=r.member_id for update;
 if r.stripe_checkout_session_id is distinct from p_session_id or p_session_id is null then raise exception 'Checkout mismatch'; end if;
 if r.status='refunded' or m.membership_status='cancelled' or m.payment_status='refunded' then raise exception 'Administrator review required'; end if;
 if m.membership_id is null or m.payment_status not in ('paid','manual_paid','waived') then raise exception 'Membership is not eligible for renewal'; end if;
 if r.status='paid' then return to_jsonb(m)||jsonb_build_object('renewal_start_date',r.starts_on,'renewal_end_date',r.ends_on); end if;
 nz_today := (now() at time zone 'Pacific/Auckland')::date;
 start_day := greatest(nz_today, coalesce(m.membership_end_date + 1, nz_today));
 if r.valid_until_month is not null then
   end_year := extract(year from start_day)::integer;
   end_day := (make_date(end_year,r.valid_until_month,1)+interval '1 month'-interval '1 day')::date;
   if end_day < start_day then end_day := (make_date(end_year+1,r.valid_until_month,1)+interval '1 month'-interval '1 day')::date; end if;
 else
   end_day := (start_day + make_interval(months=>r.validity_months)-interval '1 day')::date;
 end if;
 update public.membership_renewals set status='paid',stripe_payment_intent_id=p_payment_intent,starts_on=start_day,ends_on=end_day,updated_at=now() where id=r.id;
 update public.club_memberships set membership_status='active',membership_end_date=end_day,membership_options=jsonb_build_array(jsonb_build_object('key',r.option_key,'name',r.option_name,'quantity',1,'cents',r.amount_cents,'total_cents',r.amount_cents)),renewal_notice_sent_at=null,updated_at=now() where id=m.id returning * into m;
 return to_jsonb(m)||jsonb_build_object('renewal_start_date',start_day,'renewal_end_date',end_day);
end $$;
revoke all on function public.apply_membership_renewal(uuid,text,text) from public,anon,authenticated;
grant execute on function public.apply_membership_renewal(uuid,text,text) to service_role;
commit;
