# Auckland Knights Chess Club - First Deployable Version

This release packages the application as the first clean deployable version and includes downloadable product documentation inside the Admin/Super Admin panel.

## Included

- Admin menu item: Documentation
- Downloadable Deployment Guide PDF
- Downloadable Admin & Super Admin User Guide PDF
- PDFs stored under `public/docs/`
- Public npm registry `.npmrc` to prevent internal registry issues
- Previous generated version archives are not included in this deployable package

## Local start

```bash
npm install --registry=https://registry.npmjs.org/
npm run dev
```

## Admin documentation page

```text
/club-admin/documentation
```
