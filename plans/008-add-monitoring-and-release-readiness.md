# 008 — Monitoring and Release Readiness Implementation Plan

> **For agentic workers:** Use `superpowers:subagent-driven-development` or `superpowers:executing-plans`. Steps use `- [ ]`. EAS build/submit steps are **gated** behind explicit approval (`.claude/settings.json` marks `eas build/submit/deploy` as ask-first). Do not run them autonomously.

**Goal:** Add crash/error monitoring wired into the error boundary, and establish EAS build/submit/update configuration plus a documented, tested release-and-rollback runbook.

**Architecture:** Integrate an error-reporting client (Sentry via `@sentry/react-native`, or EAS-native insights if preferred) initialized once at app start and invoked from the root `ErrorBoundary` (`plans/003`). Add `eas.json` with build/submit profiles and an update channel scheme, manage version/build numbers, and write `docs/operations/release-runbook.md`.

**Tech Stack:** Expo SDK 54, EAS Build/Submit/Update, `@sentry/react-native` (Expo-supported), `expo-application`/`expo-updates` (as needed).

## Global Constraints

- Monitoring + structured logging required; logs must never include tokens/PII. — `.claude/rules/security.md`, `production-readiness.md`
- Production errors return safe generic copy to users; details go to telemetry. — `.claude/rules/security.md`
- Rollback planning is a known, tested way to revert a release/update. — `production-readiness.md`
- Native deps via `npx expo install`; never modify SDK/framework versions without approval. — `.claude/rules/mobile-engineering.md`, root `CLAUDE.md`
- `eas build/submit/deploy` require explicit approval each time. — `.claude/settings.json`
- Branch (`chore/...`); no commit/push without approval. — `.claude/rules/git-workflow.md`

## Confirmed Findings Addressed

- **M4** — No crash/error monitoring or structured logging.
- Release/rollback/versioning/monitoring gaps (audit §19).

## Files Affected

- Create: `src/utils/monitoring.ts` — init + `reportError` wrapper.
- Modify: `app/_layout.tsx` — initialize monitoring; report from `ErrorBoundary`.
- Create: `eas.json` — build/submit profiles + channels.
- Modify: `app.json` — `runtimeVersion`/`updates` config (only with approval; SDK/framework versions untouched).
- Create: `docs/operations/release-runbook.md` — release + rollback procedure.
- Modify: `.env.example` — document `EXPO_PUBLIC_SENTRY_DSN` (DSN is publishable, non-secret).
- Modify: `README.md` — link the runbook.

## Interfaces

- `monitoring.ts` **produces:** `initMonitoring(): void`, `reportError(error: unknown, context?: Record<string, string>): void`.

---

### Task 1: Monitoring wrapper

**Files:**
- Create: `src/utils/monitoring.ts`
- Modify: `.env.example`

- [ ] **Step 1: Install the client (Expo-resolved)**

Run: `npx expo install @sentry/react-native`
Expected: SDK-aligned version added; `expo-doctor` green.

- [ ] **Step 2: Implement an indirection so the rest of the app never imports the SDK directly**

```ts
// src/utils/monitoring.ts
import * as Sentry from '@sentry/react-native';

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';

/** Initializes crash/error reporting. No-op when no DSN is configured. */
export function initMonitoring(): void {
  if (DSN === '') return;
  Sentry.init({
    dsn: DSN,
    // Never attach tokens/PII. Scrub by default.
    sendDefaultPii: false,
    tracesSampleRate: 0.1,
  });
}

/** Reports a handled error with optional non-sensitive context. */
export function reportError(error: unknown, context?: Record<string, string>): void {
  if (DSN === '') return;
  Sentry.captureException(error, context ? { extra: context } : undefined);
}
```

- [ ] **Step 3: Document the DSN (publishable, non-secret)**

Add to `.env.example`:

```
# Sentry DSN (publishable client key — not a secret). Leave empty to disable.
EXPO_PUBLIC_SENTRY_DSN=
```

- [ ] **Step 4: Typecheck + commit**

```bash
npx tsc --noEmit
git add src/utils/monitoring.ts .env.example package.json package-lock.json
git commit -m "feat(monitoring): add Sentry-backed error reporting wrapper"
```

---

### Task 2: Initialize at startup and report from the boundary

**Files:**
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Initialize once**

At module scope (or in a top-level effect) in `app/_layout.tsx`:

```tsx
import { initMonitoring, reportError } from '@/src/utils/monitoring';
initMonitoring();
```

- [ ] **Step 2: Report from the root `ErrorBoundary`**

In the `ErrorBoundary` export added by `plans/003`, call `reportError(error)` before rendering `ScreenError` (still showing only generic copy to the user):

```tsx
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  reportError(error);
  return <ScreenError message="The app hit an unexpected problem." onRetry={retry} />;
}
```

- [ ] **Step 3: Typecheck + lint + export**

Run: `npx tsc --noEmit && npm run lint && npx expo export --platform web`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/_layout.tsx
git commit -m "feat(monitoring): init at startup and report boundary errors"
```

(If `plans/003` is not yet executed, add the `reportError` call when wiring the boundary there.)

---

### Task 3: EAS configuration

**Files:**
- Create: `eas.json`
- Modify: `app.json` (only with approval)

- [ ] **Step 1: Author `eas.json` with build/submit profiles + update channels**

```json
{
  "cli": { "version": ">= 12.0.0" },
  "build": {
    "development": { "developmentClient": true, "distribution": "internal", "channel": "development" },
    "preview": { "distribution": "internal", "channel": "preview" },
    "production": { "autoIncrement": true, "channel": "production" }
  },
  "submit": {
    "production": {}
  }
}
```

- [ ] **Step 2: Configure runtime version + updates (approval required)**

With explicit approval only, add an `updates`/`runtimeVersion` block to `app.json` (e.g. `"runtimeVersion": { "policy": "appVersion" }`) so OTA updates map to channels. Do **not** change `expo`/`react-native`/`react` versions.

- [ ] **Step 3: Validate config**

Run: `npx expo-doctor@latest && npx tsc --noEmit`
Expected: PASS (no app-config schema errors).

- [ ] **Step 4: Commit**

```bash
git add eas.json app.json
git commit -m "chore(release): add EAS build/submit profiles and update channels"
```

---

### Task 4: Release and rollback runbook

**Files:**
- Create: `docs/operations/release-runbook.md`
- Modify: `README.md`

- [ ] **Step 1: Write the runbook**

Document, with exact commands (each requiring approval before running):

- **Versioning:** how `version` and auto-incremented build numbers are managed (`production` profile `autoIncrement`).
- **Build:** `eas build --profile production --platform <ios|android>` (approval-gated).
- **Submit:** `eas submit --profile production --platform <ios|android>` (approval-gated).
- **OTA update:** `eas update --channel production --message "<summary>"`.
- **Rollback (OTA):** `eas update --channel production --message "rollback to <hash>"` republishing the last-good bundle, or `eas channel:rollout`/`eas update:rollback` to revert; verify install/launch counts in EAS Insights.
- **Rollback (store binary):** halt rollout / submit the previous known-good build; document store-specific steps.
- **Verification after release:** confirm crash-free rate in monitoring and update adoption in EAS Insights.

- [ ] **Step 2: Link from README**

Add an "Operations" link to `docs/operations/release-runbook.md` in `README.md`.

- [ ] **Step 3: Commit**

```bash
git add docs/operations/release-runbook.md README.md
git commit -m "docs(release): add release and rollback runbook"
```

---

## Security Considerations

- DSN is a publishable client key (safe in `EXPO_PUBLIC_*`); **no** server/auth tokens go in the bundle.
- Monitoring config sets `sendDefaultPii: false`; the logging policy forbids tokens/PII in breadcrumbs/extra.
- EAS submit/build remain approval-gated per `.claude/settings.json`.

## Testing Requirements

- `initMonitoring` is a no-op without a DSN (so dev/test/CI never emit events).
- Manual (staging DSN): trigger a boundary error → event appears in the Sentry project; user still sees generic copy.
- `eas.json`/`app.json` pass `expo-doctor` schema checks.

## Acceptance Criteria

- Unhandled render errors are reported to monitoring while users see only safe copy.
- `eas.json` defines development/preview/production build + submit profiles and update channels.
- A release-and-rollback runbook exists and is linked from the README.
- `tsc`, `lint`, `expo-doctor`, `expo export` green; no SDK/framework versions changed.

## Verification Commands

```bash
npx expo install @sentry/react-native   # Task 1 only
npx tsc --noEmit
npm run lint
npx expo-doctor@latest
npx expo export --platform web
# Approval-gated, not run autonomously:
# eas build --profile production --platform android
# eas update --channel production --message "..."
```

## Rollback Considerations

- Monitoring is no-op without a DSN, so it can ship dormant and be reverted by removing the init call + uninstalling the package.
- `eas.json` is additive config; deleting it disables EAS profiles without affecting the app bundle.
- The runbook itself defines the production rollback procedure (OTA republish / store rollout halt).

## Dependencies

- Builds on `plans/003` (root `ErrorBoundary`) for the report hook — if 003 is not done, wire `reportError` when the boundary is added.
- Adds `@sentry/react-native`.

## Estimated Implementation Risk: **Medium**
(Monitoring code is low-risk and dormant-by-default, but EAS/`app.json` release config touches build/update behavior and is approval-gated.)
