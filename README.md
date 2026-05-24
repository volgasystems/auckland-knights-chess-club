# Auckland Knights Chess Club Website

Version 2.1 - Blue Classic theme with admin/super-admin management.

## Key features

- Public website with Home, Tournaments, Results, News, Photo Gallery, Coaching, Live Boards, Join, Contact and Quick Links.
- Hidden admin portal at `/club-admin/login`.
- Admin access request at `/club-admin/signup`.
- Super Admin can assign roles and activate/deactivate users.
- News image upload/crop and editable news posts.
- Photo gallery upload/crop and publish/unpublish.
- Tournament categories with separate entry fees and prize fund text.
- General tournament payment before confirmed entry.
- Results page with winner photo, top 3, Vega, Lichess and PGN links.
- Reports export to CSV and PDF.
- Configurable social media links in Club Settings.
- Club address map updates from Club Settings.
- Address autocomplete on membership registration using a free New Zealand address search.

## Local setup

1. Unzip the project.
2. Open terminal in the project folder.
3. Install dependencies:

```bash
npm install
```

4. Create `.env.local`:

```bash
copy .env.example .env.local
```

or run:

```bash
setup_env_local.bat
```

5. Update `.env.local` with Supabase and Stripe values.

6. Run Supabase SQL:

- Supabase Dashboard → SQL Editor
- Run `supabase/schema.sql`

7. Start local website:

```bash
npm run dev
```

8. Open:

```text
http://localhost:3000
```

Admin login:

```text
http://localhost:3000/club-admin/login
```

Admin signup request:

```text
http://localhost:3000/club-admin/signup
```

## First Super Admin setup

Create a user using Supabase Authentication or `/club-admin/signup`, then run this in Supabase SQL Editor:

```sql
update public.profiles
set role = 'super_admin', is_active = true
where email = 'your-email@example.com';
```

## Reset and recreate database

To reset app tables only:

1. Run `supabase/reset_database.sql`
2. Run `supabase/schema.sql`

Storage files are not deleted by SQL. Delete uploaded files from Supabase Dashboard → Storage if needed.

## General tournament categories

In Admin → Tournaments, add categories using JSON:

```json
[
  { "key": "open", "name": "Open", "fee_cents": 2500, "prize": "1st $200, 2nd $100" },
  { "key": "junior", "name": "Junior U12", "fee_cents": 1500, "prize": "Trophies for top 3" }
]
```

Players select category during registration. Payment uses the selected category fee.

## Social media

Club Settings supports Facebook, Instagram, YouTube, Lichess, X and LinkedIn URLs. Published news pages include social share buttons. Direct auto-posting to social platforms requires each platform’s developer app approvals and access tokens, so this version provides share links.

## Version 2.2 changes

- Super Admin can add, edit, deactivate and remove admin/staff users from `/club-admin/users`.
- Tournament categories no longer require JSON. Use the category table fields in Admin → Tournaments.
- Reports support CSV and PDF exports from `/club-admin/reports`.
- Membership gender field is now a dropdown.
- NZ address lookup now searches automatically as the user types and populates street/suburb/city/postcode.

### PDF export note

PDF export runs in the Node.js runtime. If a PDF export fails after changing code, restart the local server with:

```bash
CTRL + C
npm run dev
```

## v2.5 Final Changes

This ZIP includes the final changes for social media, calendar, membership fee management, live boards history, settings publishing, and address autocomplete.

### For existing Supabase database

Run this migration in Supabase SQL Editor:

```sql
supabase/migration_v2_5_final_changes.sql
```

### For new Supabase database

Run:

```sql
supabase/schema.sql
```

### New admin pages

- `/club-admin/social-posts`
- `/club-admin/live-boards`
- `/club-admin/membership-options`
- `/club-admin/calendar`

### Public pages added/updated

- `/calendar`
- `/live-boards`
- Home page social media links

## v3.6 update notes

This version adds membership ID based calendar registration and member email communication.

For an existing Supabase database, run:

```text
supabase/migration_v3_6_membership_calendar_email.sql
```

New admin pages:

```text
/club-admin/email-templates
/club-admin/member-notices
/club-admin/bulk-email
```

Calendar event registration rules:

```text
Club Calendar Event = active AK membership ID/email required, no separate payment.
General/Open Tournament = separate Stripe payment required, even if the player is a club member.
```

## Brevo SMTP bulk email

Bulk email now supports Resend or Brevo/custom SMTP. See `BREVO_SMTP_SETUP.md`.

Required SMTP variables for Brevo:

```env
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_brevo_smtp_login
SMTP_PASS=your_brevo_smtp_key
CLUB_FROM_EMAIL=noreply@aucklandknights.co.nz
CLUB_FROM_NAME=Auckland Knights Chess Club
CLUB_REPLY_TO_EMAIL=info@aucklandknights.co.nz
```
