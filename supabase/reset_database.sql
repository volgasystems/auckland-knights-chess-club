-- SAFE RESET SCRIPT - Auckland Knights Chess Club
-- This resets public app tables only.
-- It does NOT delete Supabase Storage objects because Supabase blocks direct deletion from storage tables.
-- Delete uploaded files from Supabase Dashboard -> Storage if required.

-- Drop trigger first
drop trigger if exists on_auth_user_created on auth.users;

-- Drop app functions
drop function if exists public.generate_membership_id() cascade;
drop function if exists public.handle_new_user() cascade;
drop sequence if exists public.membership_id_seq;

-- Drop public app tables
drop table if exists public.email_templates cascade;
drop table if exists public.member_notices cascade;
drop table if exists public.email_delivery_logs cascade;
drop table if exists public.contact_enquiries cascade;
drop table if exists public.payment_records cascade;
drop table if exists public.live_board_links cascade;
drop table if exists public.social_posts cascade;
drop table if exists public.membership_options cascade;
drop table if exists public.elected_team_members cascade;
drop table if exists public.agm_decisions cascade;
drop table if exists public.agm_meetings cascade;
drop table if exists public.coaching_topics cascade;
drop table if exists public.coaches cascade;
drop table if exists public.faqs cascade;
drop table if exists public.gallery_photos cascade;
drop table if exists public.absences cascade;
drop table if exists public.tournament_registrations cascade;
drop table if exists public.club_memberships cascade;
drop table if exists public.tournaments cascade;
drop table if exists public.news_posts cascade;
drop table if exists public.club_settings cascade;
drop table if exists public.profiles cascade;

-- After running this file, run supabase/schema.sql again.
