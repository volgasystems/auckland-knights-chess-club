# Brevo SMTP setup for Auckland Knights bulk email

Use Brevo SMTP when Resend is not working or when you want a free SMTP option.

## 1. Create Brevo account

Go to Brevo and create/login to your account.

## 2. Find SMTP credentials

In Brevo dashboard, go to:

```text
Transactional → Settings → SMTP & API
```

Copy:

```text
SMTP server: smtp-relay.brevo.com
Port: 587
Login: your Brevo SMTP login
SMTP key/password: your generated SMTP key
```

## 3. Add values to `.env.local`

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

Restart the website after changing environment variables:

```bash
npm run dev
```

## 4. Test bulk email

Open:

```text
/club-admin/bulk-email
```

Use:

```text
Recipients = Selected individual members
```

Select one test member first, click **Preview Email**, then **Send Bulk Email**.

## Notes

- Brevo free plan is suitable for a new club, but it has daily sending limits.
- If `Recipients matched` is 0, select individual members or check membership/payment statuses.
- Emails are logged in `email_delivery_logs`.
