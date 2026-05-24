# Auckland Knights Chess Club - First Deployable Version

This package is the clean first deployable version of the Auckland Knights Chess Club web application.

## Includes

- Public website
- Admin and Super Admin portal
- Membership management
- Tournament, calendar and results management
- Stripe payment integration
- Supabase Auth, Database and Storage integration
- Resend API or SMTP/Brevo email provider options
- Bulk email, email templates and diagnostics
- Social Media Share Assistant
- PWA install support
- Product documentation available inside the Admin portal

## Product documentation

After logging into Admin/Super Admin, open:

```text
/club-admin/documentation
```

Downloadable documents included:

- Deployment Guide PDF
- Admin & Super Admin User Guide PDF

## Local setup

```bash
npm install --registry=https://registry.npmjs.org/
npm run dev
```

## Supabase setup

For a fresh database, run the supplied SQL scripts in the `supabase` folder following the deployment guide.

## Environment variables

Use `.env.example` as a template. Do not commit `.env.local` or production secrets to GitHub.
