-- Apply once in the production Supabase SQL editor; existing IDs are retained.
begin;
alter table public.club_settings add column if not exists membership_id_start bigint not null default 1001;
alter table public.club_settings add column if not exists membership_id_next bigint not null default 1001;
alter table public.club_settings add column if not exists membership_id_digits integer not null default 5;

create or replace function public.configure_membership_numbering(p_prefix text, p_start bigint, p_digits integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare highest bigint; next_number bigint; settings public.club_settings%rowtype;
begin
  p_prefix := upper(trim(p_prefix));
  if p_prefix is null or p_start is null or p_digits is null or p_prefix !~ '^[A-Z][A-Z0-9-]{0,11}$' or p_start < 1 or p_start > 999999999 or p_digits < 1 or p_digits > 9 then
    raise exception 'Use a 1–12 character prefix, a start number from 1 to 999999999, and 1–9 digits';
  end if;
  select * into strict settings from public.club_settings where id = 'default' for update;
  select coalesce(max(substring(membership_id from length(p_prefix)+1)::bigint), 0) into highest
  from public.club_memberships where left(membership_id, length(p_prefix)) = p_prefix
    and substring(membership_id from length(p_prefix)+1) ~ '^[0-9]{1,9}$';
  next_number := greatest(p_start, highest+1, case when settings.membership_id_prefix = p_prefix then settings.membership_id_next else 1 end);
  if next_number > 999999999 then raise exception 'Membership sequence is exhausted'; end if;
  update public.club_settings set membership_id_prefix = p_prefix, membership_id_start = p_start,
    membership_id_next = next_number, membership_id_digits = p_digits, updated_at = now() where id = 'default';
  return jsonb_build_object('prefix', p_prefix, 'start', p_start, 'next', next_number, 'digits', p_digits);
end;
$$;

create or replace function public.assign_membership_id(p_member_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare settings public.club_settings%rowtype; member public.club_memberships%rowtype; candidate text; n bigint;
begin
  -- Always lock configuration first, then the member, for replay/concurrency safety.
  select * into strict settings from public.club_settings where id = 'default' for update;
  select * into strict member from public.club_memberships where id = p_member_id for update;
  if nullif(member.membership_id, '') is not null then return member.membership_id; end if;
  if member.payment_status not in ('paid','manual_paid','waived') then raise exception 'Membership is not paid'; end if;
  n := greatest(settings.membership_id_next, settings.membership_id_start);
  loop
    if n > 999999999 then raise exception 'Membership sequence is exhausted'; end if;
    candidate := settings.membership_id_prefix || lpad(n::text, greatest(settings.membership_id_digits, length(n::text)), '0');
    exit when not exists(select 1 from public.club_memberships where membership_id = candidate);
    n := n + 1;
  end loop;
  update public.club_memberships set membership_id = candidate, updated_at = now() where id = p_member_id;
  update public.club_settings set membership_id_next = n + 1 where id = 'default';
  return candidate;
end;
$$;

-- Do not expose sequence changes or member-ID allocation to public clients.
revoke all on function public.configure_membership_numbering(text,bigint,integer) from public, anon, authenticated;
revoke all on function public.assign_membership_id(uuid) from public, anon, authenticated;
grant execute on function public.configure_membership_numbering(text,bigint,integer) to service_role;
grant execute on function public.assign_membership_id(uuid) to service_role;

select public.configure_membership_numbering(
  coalesce(nullif(membership_id_prefix, ''), 'AKCC'), membership_id_start, membership_id_digits
) from public.club_settings where id = 'default';
commit;
