# Setup

## Prerequisites
- Cloudflare account with Pages, Workers, and D1 access
- Wrangler CLI installed
- A Turnstile site key and secret key

## Environment
Create local environment values from the example file:

- `TURNSTILE_SECRET_KEY`
- `TURNSTILE_SITE_KEY`
- `ACCESS_ALLOWED_EMAILS`

For production, store `TURNSTILE_SECRET_KEY` as a secret instead of checking it into the repo:

```bash
wrangler secret put TURNSTILE_SECRET_KEY
```

## Database
Apply the D1 migration before deploying the app:

```bash
wrangler d1 migrations apply labadi-shipping-db --remote
```

If you are testing locally, use the local D1 workflow first and switch to `--remote` when you are ready for production.

## Deploy
Deploy with Wrangler after secrets and migrations are in place:

```bash
wrangler deploy
```

## Verify
- Open the site and confirm the lead form submits successfully.
- Submit the same email twice and confirm the duplicate-email response is returned.
- Download the leads CSV while authenticated through Cloudflare Access.
