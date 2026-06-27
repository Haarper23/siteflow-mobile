# Monitoring (Sentry) Setup

How crash/error monitoring is wired in SiteFlow AI Mobile, the privacy
boundaries it enforces, and the **manual** steps a maintainer must complete to
turn it on. Nothing here requires committing a real credential.

## How it works in this repo

- The app talks to an internal adapter, `src/services/monitoring.ts`, never to
  `@sentry/react-native` directly. The logger (`src/utils/logger.ts`) forwards
  warnings/errors through it.
- `app/_layout.tsx` calls `initializeMonitoring()` once at startup. It is a
  **no-op when no DSN is configured** and is wrapped so it can never block
  startup.
- Both error boundaries (`app/_layout.tsx` and `app/(app)/_layout.tsx`) report
  uncaught render errors via `logger.error`, which deduplicates so the same error
  is sent at most once. Users always see the generic branded fallback — never a
  stack trace.
- The DSN comes from `EXPO_PUBLIC_SENTRY_DSN` (a **publishable** client key,
  safe in the bundle). With it empty, the app runs fully with monitoring off —
  the correct local/CI/test default.

## Privacy boundaries (enforced in code)

`initializeMonitoring()` configures Sentry conservatively, and every event and
breadcrumb is scrubbed (`scrubEvent` / `redactSensitiveData`). The following are
**never** sent:

- Passwords, passcodes, tokens, authorization headers, cookies, secrets, API
  keys, session values, credentials.
- Report descriptions, issue descriptions, free-text notes/comments.
- Photos or photo/file URIs and local device paths.
- Worker / customer / company identity; raw email addresses; phone numbers.
- A user identity — the app has only a **local demo session**, so no Sentry user
  is ever set, and `event.user` is stripped.

Also disabled: session replay, screenshots, view-hierarchy capture,
user-interaction tracing, performance tracing, profiling, and debug mode.
Console breadcrumbs are dropped (they can echo app logs).

Only safe metadata is attached to a report: boundary type, app version,
platform, and operation/event name.

> Test Sentry events must use **synthetic** data only (e.g. a DSN like
> `https://public@example.invalid/1`). This document does not claim any legal
> compliance certification, and a final Privacy Policy is out of scope here.

## Manual setup steps (maintainer)

These are **not** performed automatically and must not change remote settings
without intent.

1. **Create or select a Sentry project** (React Native platform) in your Sentry
   org. Do this in the Sentry dashboard.
2. **Copy the client DSN** from *Settings → Projects → [project] → Client Keys
   (DSN)*.
3. **Local development:** create a local `.env` (gitignored) and set:
   ```
   EXPO_PUBLIC_SENTRY_DSN=<your-dsn>
   EXPO_PUBLIC_APP_ENV=development
   ```
   Leaving the DSN empty keeps monitoring off.
4. **EAS environment variables:** set `EXPO_PUBLIC_SENTRY_DSN` per environment so
   preview/production builds report under the right `environment`. (`eas.json`
   already sets `EXPO_PUBLIC_APP_ENV` per profile.)
5. **Source-map upload secret:** set `SENTRY_AUTH_TOKEN` as a **secure** EAS
   environment variable / CI secret with sensitive visibility. **Never** commit
   it, never echo it in CI logs, never prefix it with `EXPO_PUBLIC_`.
6. **Org/project for upload:** set `SENTRY_ORG` and `SENTRY_PROJECT` as build
   environment variables (EAS/CI). The `@sentry/react-native` Expo config plugin
   (in `app.json`) and `metro.config.js` (`getSentryExpoConfig`) read these at
   **native/EAS build time** to upload source maps automatically. No real org or
   project slug is committed in this repo.
7. **Produce a future preview build** (`eas build --profile preview …`,
   approval-gated) once steps 1–6 are done.
8. **Trigger one synthetic test error** in that build.
9. **Verify** the event's `environment`, `release` (`siteflow-mobile@<version>`),
   and that source maps resolved the stack.
10. **Confirm the event contains no** business-record text, token, or photo path.
11. **Confirm the ErrorBoundary fallback** still appears to the user.
12. **Confirm monitoring-disabled mode** still works (empty DSN → app fine).

## Where each variable must live

| Variable | Secret? | `EXPO_PUBLIC_`? | Where it lives |
| --- | --- | --- | --- |
| `EXPO_PUBLIC_SENTRY_DSN` | No (publishable) | Yes | `.env` (local) / EAS env vars |
| `EXPO_PUBLIC_APP_ENV` | No | Yes | `eas.json` per profile / `.env` |
| `SENTRY_ORG` | No | **No** | EAS/CI build env |
| `SENTRY_PROJECT` | No | **No** | EAS/CI build env |
| `SENTRY_AUTH_TOKEN` | **Yes** | **No** | Secure EAS/CI secret only |

The `.gitignore` already excludes `.env*`, `.sentryclirc`, `sentry.properties`,
and `.env.sentry-build-plugin`, plus `dist/` (so generated source maps are not
committed).
