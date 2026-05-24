# Admin & Super Admin User Guide

## Admin URLs

- Admin login: `/club-admin/login`
- Admin access request: `/club-admin/signup`
- Dashboard: `/club-admin/dashboard`

Public club members do not login. They use `/join` for membership registration.

## Super Admin

Super Admin can manage users, roles, club settings, tournaments, results, news, gallery, FAQ, coaching, AGM notices, absences and reports.

## User role management

Go to `/club-admin/users`.

Super Admin can:

- Search users.
- Update first and last name.
- Assign role.
- Activate/deactivate access.

New users may request access from `/club-admin/signup`, but cannot access admin pages until Super Admin approves and assigns a role.

## News

Go to `/club-admin/news`.

You can:

- Add news.
- Edit existing news.
- Upload/crop image.
- Publish/unpublish.

Published news appears on `/news`. News detail pages include social share buttons.

## Photo Gallery

Go to `/club-admin/photo-gallery`.

Upload/crop photo, add title/description, tick Publish, then save. Published photos appear on `/photo-gallery`.

## Tournaments

Go to `/club-admin/tournaments`.

For general events, enable:

- Allow public registration
- Require payment
- Show public entries

Set max players. When confirmed paid registrations reach the limit, public registration is disabled.

Use Categories JSON for different fees/prizes.

## Results

Set tournament status to `completed` or add winner/result details. Results appear on `/results`.

Add:

- Winner photo
- 1st, 2nd, 3rd names
- Vega link
- Lichess live board link
- PGN link
- Prize details

## Live Boards

Configure global Lichess live board URL in Club Settings. Tournament-specific Lichess links can be added in each tournament.

Public page: `/live-boards`.

## Club Settings

Go to `/club-admin/settings`.

Update:

- Club address
- General email
- Senior club captain details
- Junior club captain details
- Live boards URL
- Social media URLs

The home/contact map updates from Club Address.

## Reports

Go to `/club-admin/reports`.

Export:

- Members CSV/PDF
- Tournament registrations CSV/PDF
- Absences CSV/PDF
- Payments CSV/PDF

## Version 2.2 admin notes

### Managing admin users

Go to `/club-admin/users`. Super Admin can use **Add User**, **Save/Edit**, and **Remove**. Public club members are not admin users and do not need login access.

### Tournament categories

Go to `/club-admin/tournaments`. Use **Add Category** under Tournament Categories, Fees and Prize Fund. Enter category name, fee in cents, and prize details. No JSON knowledge is required.

### Address autocomplete

Membership registration has automatic New Zealand address suggestions. Select a suggestion to populate street, suburb, city, and postcode.
