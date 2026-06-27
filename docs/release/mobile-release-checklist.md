# Mobile Release Checklist

Work top-to-bottom before any preview/production build or submission. **Do not
tick an item you have not actually verified.** Companion docs:
[release runbook](../operations/release-runbook.md),
[rollback plan](./rollback-plan.md),
[monitoring setup](../monitoring/sentry-setup.md).

> Reminder: this app still uses a **local demo session** and **local storage**
> only. Release it as a demo / pilot, not as a production, credential-bearing
> app (see `docs/audits/production-readiness-audit.md`).

## Source & review

- [ ] `main` is clean and up to date; release branch merged via PR.
- [ ] PR approved and all required CI checks green.
- [ ] CodeQL has no unresolved high/critical alerts.
- [ ] Dependency Review passed (no new high/critical-severity deps).

## Quality gates (run locally and/or in CI)

- [ ] Tests pass — `npm test -- --runInBand` (record the exact suite/test count).
- [ ] Coverage reviewed — `npm run test:coverage -- --runInBand`.
- [ ] TypeScript clean — `npx tsc --noEmit`.
- [ ] Lint clean — `npm run lint`.
- [ ] Project health — `npx expo-doctor@latest --verbose`.
- [ ] Web bundle builds — `npx expo export --platform web`.
- [ ] Dependency audit — `npm audit --audit-level=high` (known transitive
      dev/build advisories are tracked; do **not** `audit fix --force`).
- [ ] No whitespace/merge errors — `git diff --check`.

## Versioning (see runbook §2)

- [ ] `expo.version` correct for this release.
- [ ] `expo.android.versionCode` incremented if submitting to Android.
- [ ] `expo.ios.buildNumber` incremented if submitting to iOS.
- [ ] Version change committed (because `appVersionSource` is `local`).

## Configuration & secrets

- [ ] Correct build profile chosen (`development` / `preview` / `production`).
- [ ] `EXPO_PUBLIC_APP_ENV` resolves to the intended environment for the build.
- [ ] No `.env` file is committed; `.env.example` contains placeholders only.
- [ ] No production secrets in source, `app.json`, or `EXPO_PUBLIC_*` vars.
- [ ] `EXPO_PUBLIC_SENTRY_DSN` set (or intentionally empty to keep monitoring off).
- [ ] `SENTRY_ORG` / `SENTRY_PROJECT` / `SENTRY_AUTH_TOKEN` exist **only** as
      secure EAS/CI build secrets — never committed, never `EXPO_PUBLIC_`.
- [ ] No keystore, `.p8`/`.p12`/`.mobileprovision`/`.pem`, or service-account
      JSON is committed; no generated source maps or `dist/` committed.

## Monitoring

- [ ] Sentry project selected; DSN verified for the target environment.
- [ ] Source-map upload configured for native/EAS builds (token in build env only).
- [ ] After build: a synthetic test error appears with the expected
      `environment` and `release`, and **no** business text/token/photo path.

## Smoke tests

- [ ] Development/preview build installs and launches.
- [ ] Production build (or its release candidate) launches and is visibly the
      production variant (no dev diagnostics).
- [ ] Auth limitation understood: local demo session only; logout and protected
      routes behave correctly.
- [ ] Local data survives restart and logout (Issues, Daily Reports,
      Notifications) — storage-schema/migration compatibility holds.
- [ ] Valid photo attaches; a broken/removed photo URI degrades gracefully.
- [ ] Offline / local-data behaviour works (no network layer expected).
- [ ] Accessibility smoke test: labels present; reduced-motion respected.
- [ ] Privacy review: monitoring carries no PII/secrets/free-text (see setup doc).

## Release decision

- [ ] Rollback decision made and rollback plan re-read.
- [ ] Release notes written.
- [ ] Store metadata readiness reviewed (listing, screenshots) — **N/A until a
      real store release is intended; the app is currently a demo/pilot and is
      not published to the App Store or Google Play.**
- [ ] Privacy Policy / Data Safety readiness reviewed — **not yet authored;
      required before any real store submission, out of scope for a demo build.**
