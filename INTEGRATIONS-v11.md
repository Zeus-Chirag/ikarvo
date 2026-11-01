# Third-party integrations

This project integrates with a number of external services. The sections below list each integration — what it is, what credentials it needs, and the least you need to do to get it working locally.

## Getting started

1. Copy `.env.example` to `.env.local`.
2. Fill in the values marked required for the integrations you want to enable.
3. Run `npm run dev`.

Do **not** commit `.env.local`. It is in `.gitignore` for that reason.

---

## Supabase (required for cloud mode)

**What it is:** The backend database and auth provider for the app.

**Why it is required:** Accounts, workspaces, uploads, integration tokens, credits, and settings are all stored in Supabase when the app is running in cloud mode. Without it, only the preview/local mode works.

**What you need:**

- A Supabase project.
- The project URL and anon/service role key.
- The database migrations under `supabase/migrations/` applied to the project.

**Env vars:**

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

The two `NEXT_PUBLIC_` variables are safe to expose to the browser. The service role key must stay server-side only.

**When you can skip it:** Only in local preview mode. If you start the app without Supabase configured, it will still open, but most features that depend on the database will not work.

---

## GitHub

**What it is:** OAuth connection so a user can link their GitHub account and, where relevant, act on repos through the app.

**What you need:**

- A GitHub OAuth App (not a PAT).
- The callback URL registered in the GitHub OAuth App settings.

**Env vars:**

```
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_CALLBACK_URL=
```

`GITHUB_CALLBACK_URL` must match what you register on GitHub exactly.

---

## Vercel

**What it is:** OAuth connection to Vercel, used where the app needs to act on a user's Vercel projects or deployments.

**What you need:**

- A Vercel project with OAuth configured.
- The client ID and secret for that integration.

**Env vars:**

```
VERCEL_CLIENT_ID=
VERCEL_CLIENT_SECRET=
VERCEL_INTEGRATION_SLUG=
VERCEL_CALLBACK_URL=
```

---

## Google

**What it is:** OAuth connection to Google, used where the app needs to act on a user's Google account or resources.

**What you need:**

- A Google OAuth 2.0 Client ID and secret.
- The authorized redirect URI registered in the Google Cloud Console.

**Env vars:**

```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=
```

---

## Meta Ads

**What it is:** Meta Ads integration for ad accounts and campaigns.

**What you need:**

- A Meta app with the appropriate Marketing API permissions.
- App ID and secret.

**Env vars:**

```
META_APP_ID=
META_APP_SECRET=
META_CALLBACK_URL=
SESSION_SECRET=
```

`SESSION_SECRET` is also used to encrypt integration tokens before they are stored. Use a long random value.

---

## Stripe (billing)

**What it is:** Payments and billing for the app.

**What you need:**

- A Stripe account.
- A publishable key, a secret key, and a price ID for the plan you want to sell.
- A webhook signing secret for Stripe webhook processing.

**Env vars:**

```
STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_PRICE_ID=
STRIPE_WEBHOOK_SECRET=
```

---

## CMS

**What it is:** A CMS integration, where the app reads or writes content through a CMS provider.

**What you need:**

- Credentials for the CMS you choose to use.

**Env vars:**

```
CMS_CLIENT_ID=
CMS_CLIENT_SECRET=
CMS_CALLBACK_URL=
```

This section is generic. If you wire up a specific CMS, update this file to name it and the exact scopes it needs.

---

## Other OAuth providers

The app is built so additional OAuth providers can be added in the same shape as the ones above: client ID, client secret, callback URL. When you add one, add a section here with the same three things:

1. What it is.
2. What the user needs to create.
3. The exact env vars it needs.

---

## Encryption

Integration tokens are encrypted before storage using AES-256-GCM, keyed by `SESSION_SECRET`. That means:

- `SESSION_SECRET` must be set and kept secret.
- Do not reuse it across environments.
- If you rotate it, previously stored tokens can no longer be read until they are re-saved.

---

## Quick checklist for the app to work end to end

- Supabase project + migrations applied.
- At least one OAuth provider configured if you want users to connect accounts.
- `SESSION_SECRET` set.
- Stripe configured if you want billing to work.

---

## What this file is for

This file is a single place to look up what each integration needs. If a feature fails because a credential is missing, check this file first, then check `.env.local`.