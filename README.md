# Labadi Shipping Website

Cloudflare Pages site for lead capture and protected CSV export of leads.

## What lives here
- `index.html` - landing page and lead capture UI
- `functions/api/leads.js` - lead submission endpoint
- `functions/api/reports/leads.js` - authenticated CSV export endpoint
- `migrations/0001_create_leads.sql` - D1 schema
- `wrangler.toml` - Cloudflare configuration

## Setup
See [SETUP.md](SETUP.md) for environment variables, D1 migration steps, and deployment commands.

## Notes
- Turnstile uses a production site key from your Cloudflare setup; do not keep test keys in production.
- Required secret: `TURNSTILE_SECRET_KEY`
- Public site key: `TURNSTILE_SITE_KEY`
- Optional report allowlist: `ACCESS_ALLOWED_EMAILS`

## Archive policy
The `archive/` folder is for historical snapshots only. Its contents are not deployed and should not be treated as the source of truth.
