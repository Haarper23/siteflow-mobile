# SiteFlow AI Mobile — Release Runbook

Operational guide for building, releasing, and rolling back the SiteFlow AI
mobile app with EAS. It is the entry point for the more detailed companions:

- Pre-release checklist — [`docs/release/mobile-release-checklist.md`](../release/mobile-release-checklist.md)
- Rollback plan — [`docs/release/rollback-plan.md`](../release/rollback-plan.md)
- Monitoring setup — [`docs/monitoring/sentry-setup.md`](../monitoring/sentry-setup.md)

> **Current product state (read first).** The app still uses a **local demo
> session** (no backend, no real authentication/authorization) and **local
> AsyncStorage / SecureStore** only. Nothing is synced to a server. It should
> ship only as a clearly-labelled **demo / pilot**, never as a
> credential-bearing production release. See the production-readiness audit
> (`docs/audits/production-readiness-audit.md`).

> **Not yet connected to EAS.** `app.json` has no `extra.eas.projectId` and the
> project is not linked to an Expo account. The commands below require a
> maintainer to run `eas init` / `eas login` first (a remote action — get
> approval and do it deliberately). `eas build`, `eas submit`, and `eas update`
> are **approval-gated** in `.claude/settings.json` and must never be run
> autonomously.

## 1. Environments and profiles

`eas.json` defines three build profiles. Each sets `EXPO_PUBLIC_APP_ENV`, so the
running app (and its monitoring events) reports the correct environment.

| Profile | Distribution | `EXPO_PUBLIC_APP_ENV` | Channel\* | Purpose |
| --- | --- | --- | --- | --- |
| `development` | internal (APK / iOS simulator) | `development` | `development` | Local developer testing |
| `preview` | internal (APK) | `preview` | `preview` | Internal tester / stakeholder builds |
| `production` | store | `production` | `production` | Store-ready release builds |

\* Channels are declared for **future** EAS Update use. EAS Update is **not yet
enabled** (see §6); until then channels are inert labels.

## 2. Versioning

`eas.json` sets `cli.appVersionSource: "local"`, so the source files are the
single source of truth for versions.

- **User-facing version** — `expo.version` in `app.json` (currently `1.0.0`).
  Bump it manually (semver) when you cut a release intended for users.
- **Android build number** — `expo.android.versionCode` (currently `1`).
  Increment by 1 for every Android build submitted to a store track.
- **iOS build number** — `expo.ios.buildNumber` (currently `"1"`).
  Increment for every iOS build uploaded to App Store Connect / TestFlight.

`autoIncrement` is intentionally **off** on every profile: with `local`
appVersionSource it would rewrite tracked files mid-build and require a commit.
Bump the relevant number in `app.json`, commit it, then build. (When the project
is later linked to EAS and switched to `appVersionSource: "remote"`,
`autoIncrement` can manage build numbers server-side — document that switch when
it happens.)

Rules of thumb:

- Adding config or docs (like this change) does **not** bump any version.
- A new build for the same code that needs a fresh store upload → bump only the
  native build number.
- A user-visible release → bump `version` and the native build number(s).

## 3. Build (approval-gated)

```bash
# Internal preview build for testers
eas build --profile preview --platform android
eas build --profile preview --platform ios

# Store-ready production build
eas build --profile production --platform android
eas build --profile production --platform ios
```

Do not pass store credentials, keystores, or service-account files on the
command line or commit them. Let EAS manage credentials interactively the first
time, or configure them via the EAS dashboard.

## 4. Submit (approval-gated)

```bash
eas submit --profile production --platform android
eas submit --profile production --platform ios
```

Submission is **never** automatic. Complete the pre-release checklist first.

## 5. Monitoring verification after release

1. Confirm the build/release shows the expected `environment` and `release`
   (`siteflow-mobile@<version>`) in Sentry — see the monitoring setup doc.
2. Trigger one **synthetic** test error in a preview build and confirm it
   arrives with no business-record text, token, or photo path attached.
3. Watch the crash-free rate after release; if it drops, follow the rollback
   plan.

## 6. EAS Update (OTA) — deferred decision

EAS Update is **not configured** in this repo: `expo-updates` is not installed
and `app.json` has no `updates` / `runtimeVersion` block (that change is
approval-gated and intentionally not made here). OTA updates can only ship
JavaScript/asset changes — never native-code changes — so enabling them requires
a deliberate `runtimeVersion` policy decision.

To enable later (with approval):

1. `npx expo install expo-updates`.
2. Add a `runtimeVersion` policy to `app.json` (e.g. `{ "policy": "appVersion" }`)
   and the `updates` URL tied to the **verified** Expo project.
3. Map the `development` / `preview` / `production` channels (already in
   `eas.json`) to update branches.
4. Document native-compatibility constraints and the OTA rollback procedure in
   the rollback plan before publishing any update.

Until then, every change ships as a new native build.

## 7. Rollback

See [`docs/release/rollback-plan.md`](../release/rollback-plan.md). In short:
prefer **revert commits + a new build**; never rewrite `main` history; remember
that store binaries cannot be instantly rolled back and that OTA cannot fix
native incompatibilities.
