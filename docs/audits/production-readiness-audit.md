# SiteFlow AI Mobile — Production-Readiness Audit

**Date:** 2026-06-26
**Branch:** `chore/production-foundation`
**Scope:** Full read-only audit of the existing Expo SDK 54 / Expo Router 6 / React Native 0.81 / React 19 app. Documentation and planning only — no source, config, or dependency changes were made.
**Auditor note:** Every finding below was derived from reading the code and running the safe verification commands in §20. No secret values are printed anywhere in this document.

---

## 1. Executive Summary

SiteFlow AI Mobile is a **well-built, local-first prototype** of a construction site-management app. The engineering hygiene is genuinely strong: TypeScript is in `strict` mode with **zero** uses of `any`, `@ts-ignore`, or `@ts-expect-error`; there are **no `console.*` calls** in app/src code; and `tsc`, `expo lint`, `expo-doctor`, and `expo export` all pass cleanly. The data layer is local-first over AsyncStorage with sensible seed-vs-empty handling, and the multi-step forms already implement unsaved-change prompts, Android back handling, per-step validation, and submit guards.

It is **not yet production-ready**, and that is expected at this stage — there is no backend, so the entire security model (authentication, authorization, validation, rate limiting, AI budgets) is still unimplemented. Per `production-readiness.md`, "a feature is not production-ready only because the UI works."

The most important **confirmed defects that exist today** (independent of the missing backend) are:

1. A **draft "resurrection" data-integrity bug** on report submission caused by a stale-closure race (deletes the draft and re-adds it from stale state in the same handler). **(High)**
2. **No error boundaries anywhere** — any render error white-screens the whole app. **(High)**
3. **Unvalidated deserialization** of stored data (`JSON.parse(...) as ConstructionIssue[]`) — malformed array elements flow straight into the UI and crash it. **(High)**
4. **No automated tests and no test runner**, despite business logic, storage, and context providers that the project's own `testing.md` says require coverage. **(High)**
5. **Login is a cosmetic client-side gate** and the `(app)` route group is reachable without it (deep-link bypass); **demo credentials are hardcoded** in the bundle. **(Critical for any real release; acceptable only for the current demo phase.)**

This report enumerates 2 critical, 4 high, 6 medium, and 9 low findings, plus a recommended implementation order (§21) and a concrete definition of "production ready" for this product (§22). Eight independent implementation plans are provided under `plans/`.

---

## 2. Current Architecture

**Stack:** Expo SDK ~54.0.34, Expo Router ~6.0.23 (typed routes + React Compiler experiments on), React Native 0.81.5, React 19.1.0, TypeScript ~5.9.2 (`strict`), New Architecture enabled.

**Routing (`app/`):**
- `app/_layout.tsx` — root `Stack` (no headers, fade animation) wrapped in `SafeAreaProvider` + light `StatusBar`.
- `app/index.tsx` — splash; `setTimeout(1500)` then `router.replace('/login')` (timer is cleaned up).
- `app/(auth)/login.tsx` — login form (demo credential check).
- `app/(app)/_layout.tsx` — wraps the authed area in `IssueProvider` + `DailyReportProvider`; declares the inner stack.
- `app/(app)/(tabs)/` — `home`, `projects`, `report`, `notifications`, `profile`.
- `app/(app)/issues/` — `index`, `new`, `[id]`.
- `app/(app)/daily-reports/` — `index`, `new`, `[id]`.
- `app/(app)/projects/[id]`.

**State (`src/context/`):** Two React context providers — `IssueContext` and `DailyReportContext` — each holding the full collection in memory and mirroring it to AsyncStorage through a `persist()` helper. Mock seed data is written on first launch only (guarded by a `null` check).

**Persistence (`src/utils/`):** `issueStorage.ts` and `dailyReportStorage.ts` wrap AsyncStorage with `load`/`save`/`clear`, try/catch around JSON, and a `null` (never-stored) vs `[]` (corrupt) distinction.

**Domain (`src/types/`, `src/data/`):** Strong domain models for issues and daily reports; static seed data for issues, daily reports, projects, and notifications.

**UI (`src/components/`, `src/theme/`):** ~22 presentational components and a single `colors` design-token module. Dark, industrial palette.

**Data flow:** Projects/notifications are static module constants; issues and daily reports are dynamic (context + AsyncStorage). The home dashboard mixes both (live issue/worker counts alongside hardcoded "Active Projects: 4" / "Safety Alerts: 2" / a static "Today's Priorities" list).

---

## 3. Current Strengths

These are real and worth preserving:

- **Type safety discipline:** `strict` TS, and a repo-wide search found **zero** `any`, `@ts-ignore`, `@ts-expect-error`, or `eslint-disable`. Route params and Expo Router paths are typed.
- **Clean tooling baseline:** `tsc --noEmit`, `expo lint`, `expo-doctor` (18/18), and `expo export --platform web` all pass (§20).
- **No sensitive logging:** no `console.*` statements anywhere in `app/` or `src/`.
- **Secret hygiene in Git:** comprehensive `.gitignore` (env, keys, `.p12/.p8/.mobileprovision`, `secrets/`, `credentials/`); only `.env.example` is tracked; no `.env*` and no `app-example/` committed.
- **Local-first storage done carefully:** try/catch around parse and write; `null` (seed) vs `[]` (corrupt) distinction; seed-once guard prevents clobbering user data on relaunch.
- **Form robustness:** `isSaving` submit guard, unsaved-changes discard prompt, Android hardware-back handling via `useFocusEffect` + `BackHandler` (with cleanup), per-step validation, and **duplicate daily-report detection** for the same project/date.
- **List virtualization done right:** `issues/index` and `daily-reports/index` put filters/search into `ListHeaderComponent` of a single `FlatList` — avoiding nested vertical `VirtualizedList`s. Stable `keyExtractor={(item) => item.id}`.
- **Permissions handled safely:** `PhotoPickerSection` checks `granted`, handles `canceled`, guides the user to Settings on denial, guards camera on web, and wraps picker calls in try/catch.
- **Accessibility baseline:** most icon-only buttons have `accessibilityLabel`; selection controls use `accessibilityRole`/`accessibilityState`; status is generally conveyed by **text + color** (e.g. `StatusBadge` renders a label), not color alone.
- **Layout correctness:** `SafeAreaProvider`/`useSafeAreaInsets` and `KeyboardAvoidingView` used throughout; flex layouts, no hardcoded screen heights.

---

## 4. Critical Findings

> "Critical" here = blocks any real (non-demo) release. Both are acceptable **only** because the app is currently a backend-less demo.

### C1 — No real authentication/authorization; `(app)` routes reachable without login
- **Severity:** Critical (production-blocking) · **Confirmed**
- **Files:** `app/(auth)/login.tsx:39-66`, `app/(app)/_layout.tsx`, `app/index.tsx:9-15`
- **Evidence:** Login is `email === DEMO_EMAIL && password === DEMO_PASSWORD` → `router.replace('/home')`. `app/(app)/_layout.tsx` has **no auth guard** — it only mounts data providers. The web export (§20) lists `/home`, `/issues`, `/daily-reports/new`, etc. as directly addressable routes, so any deep link / URL bypasses the login screen entirely. No token, no session, no `expo-secure-store`.
- **Risk:** With a backend, this would be a complete authz bypass. Even now it means "logged-in" is not a real state and cannot gate anything.
- **Recommended fix:** Introduce an auth context + a route guard in `(app)/_layout.tsx` that redirects unauthenticated users to `/login`; store the session token in `expo-secure-store` (never AsyncStorage) once a backend exists. See `plans/001`.
- **Verification:** Manual — cold-launch deep link to `/home` should redirect to `/login`; `tsc`, `lint`, `expo export`.

### C2 — Hardcoded demo credentials in the shipped bundle
- **Severity:** Critical (production-blocking) · **Confirmed**
- **Type of secret:** Demo-account email + password (UI placeholder credentials). **Not** a production API key, DB credential, or signing secret; there is no backend they authenticate against.
- **Affected file path:** `app/(auth)/login.tsx:19-20` (defined) and `:192-199` (rendered on screen).
- **Tracked by Git:** **Yes** (committed in source).
- **Risk:** Anyone with the bundle sees these strings. If a future backend ever provisions a real `demo@siteflow.ai` with this password, the demo becomes a real, publicly-known credential.
- **Required rotation action:** Before wiring real auth, remove the hardcoded constants and the on-screen demo card; if a demo login is still wanted, source it from a non-production config and ensure it maps only to a throwaway sandbox account. Treat the current password as burned — do not reuse it for any real account.
- **Verification:** `grep` confirms removal; `lint`/`tsc`/`expo export`. See `plans/001`.

---

## 5. High-Priority Findings

### H1 — Draft "resurrection" on submit (stale-closure race)
- **Severity:** High · **Confirmed**
- **Files:** `app/(app)/issues/new.tsx:299-347` and `app/(app)/daily-reports/new.tsx:365-407`; root cause in `src/context/IssueContext.tsx:108-193` and `src/context/DailyReportContext.tsx:150-213`.
- **Evidence:** `handleSubmit` does `await deleteDraft(draftId)` then `await addIssue(payload)`. Both `deleteDraft` and `addIssue` are `useCallback`s closed over the **same** `allIssues` snapshot from the screen's current render. `deleteDraft` persists `allIssues.filter(...)` (draft removed), but `addIssue` then persists `[issue, ...allIssues]` using the **original** `allIssues` that still contains the draft. The second write overwrites the first.
- **Result:** After submitting a report that began as a draft, **both** the new submitted item **and** the original draft remain in storage — a duplicated/orphaned draft and an inconsistent collection.
- **Risk:** Data integrity. Draft list grows with zombie drafts; counts and "drafts" badges become wrong; user sees a draft they thought they submitted.
- **Recommended fix:** Make the deletion atomic with the insert. Either (a) add a single context action that removes the draft and inserts the finished record in one `persist()`, or (b) have the reducer/setter operate on the latest state via the functional updater form so reads are never stale. See `plans/002`.
- **Verification:** Unit test on the context: seed a draft, call submit-equivalent, assert exactly one record remains and `isDraft === false`. Plus manual repro. (Requires the test runner from `plans/004`.)

### H2 — No error boundaries; a single render error white-screens the app
- **Severity:** High · **Confirmed**
- **Files:** none exist — `app/_layout.tsx`, `app/(app)/_layout.tsx` (no `ErrorBoundary` export), no global handler.
- **Evidence:** Expo Router supports a per-route `ErrorBoundary` export and a root boundary; none is present. There is no `<ErrorBoundary>` component and no `ErrorUtils`/global handler. Storage and date utils degrade gracefully, but any component throw (e.g. an unexpected shape from H3) is unhandled.
- **Risk:** One bad record or one component bug takes down the entire app with no recovery path and no telemetry. `mobile-engineering.md` requires error states "for any screen that fetches or persists data."
- **Recommended fix:** Add a root `ErrorBoundary` (Expo Router export) with a branded fallback + "Try again", and route-level boundaries for the data-driven stacks. Pair with crash monitoring (`plans/008`). See `plans/003`.
- **Verification:** Render a component that throws behind the boundary; confirm fallback UI instead of a crash; `expo export`.

### H3 — Unvalidated deserialization of stored collections
- **Severity:** High · **Confirmed**
- **Files:** `src/utils/issueStorage.ts:11-26`, `src/utils/dailyReportStorage.ts:11-26`.
- **Evidence:** `load*` guards against parse errors and non-arrays, but then does `return parsed as ConstructionIssue[]` / `as DailySiteReport[]`. Array **elements** are never validated. A stored array of wrong-shaped objects (older schema, partial write, manual tampering, future migration) passes through, and the UI then reads `.photos.length`, `.workforce`, `.activities.map(...)`, `new Date(item.createdAt)` etc. on undefined fields.
- **Risk:** Storage-corruption crash with **no** error boundary to catch it (compounds H2). Unsafe type assertion masks the gap from the type checker.
- **Recommended fix:** Add a runtime validator (hand-written type guards or a schema lib if justified) that drops/repairs invalid elements on load, plus a schema-version key for future migrations. See `plans/002`.
- **Verification:** Unit tests for success / empty / non-array / malformed-elements / read-throws (the five cases `testing.md` mandates for storage utilities).

### H4 — No automated tests and no test runner
- **Severity:** High · **Confirmed**
- **Files:** `package.json:5-12` (no `test` script; no jest/RNTL deps), entire `src/utils`, `src/context`, forms.
- **Evidence:** `testing.md` explicitly requires unit tests for business logic (`src/utils/*`, `src/data/*`), storage utilities (5 cases each), context providers (state transitions + persistence), and form validation/double-submit. None exist.
- **Risk:** Regressions ship silently. H1/H3 are exactly the class of bug a small test suite would have caught. The project rules forbid claiming a change works without running checks — yet there is nothing to run.
- **Recommended fix:** Add `jest-expo` + `@testing-library/react-native`, a `test` script, and a first suite covering date utils, storage (5 cases), and the H1 context behavior. See `plans/004`. (Note: `testing.md` says not to add test deps as part of *foundation/config* work — this is a deliberate, separately-scoped testing task.)
- **Verification:** `npm test` green in CI (`plans/006`).

---

## 6. Medium-Priority Findings

### M1 — Picked image URIs persisted directly; photos can become invalid
- **Severity:** Medium · **Confirmed**
- **Files:** `src/components/PhotoPickerSection.tsx:29-39, 51-56`; consumed by both forms; persisted via the contexts.
- **Evidence:** `assetToPhoto` stores `asset.uri` verbatim into the `IssuePhoto`/`DailyReportPhoto` model, which is JSON-serialized into AsyncStorage. Image-picker/camera URIs are frequently temporary cache locations (`file://.../ImagePicker/...`, `content://...`) that the OS may purge and that don't survive reinstalls or move across devices.
- **Risk:** Evidence photos silently break — thumbnails and the preview modal show broken images for "saved" issues/reports. For a construction-evidence product this is a meaningful data-loss class.
- **Recommended fix:** On selection, copy the asset into the app's document directory under a generated filename (aligns with `security.md` "rename uploaded files using generated IDs") and persist that stable path; add a graceful broken-image fallback. See `plans/002`.
- **Verification:** Manual relaunch-after-pick test; unit test on the copy helper once `expo-file-system` is justified/added.

### M2 — Double-submit guard relies on a stale-closure boolean
- **Severity:** Medium · **Confirmed**
- **Files:** `app/(app)/issues/new.tsx:285-347`, `app/(app)/daily-reports/new.tsx:351-407`.
- **Evidence:** `if (isSaving) return;` reads the `isSaving` value captured at render. `setIsSaving(true)` does not update that captured value, and `disabled={isSaving}` also only takes effect on re-render. Two synchronous taps in the same frame can both pass the guard before the first re-render.
- **Risk:** Rare but real duplicate submission (two issues / two daily reports). The daily-report duplicate check runs *before* `setIsSaving`, so it does not protect against this either.
- **Recommended fix:** Back the guard with a `useRef` flag set synchronously at the top of the handler and cleared in `finally`. See `plans/007`.
- **Verification:** Unit/integration test simulating rapid double-press asserts a single create call.

### M3 — Notifications "mark all read" and tab badge are non-persistent / hardcoded
- **Severity:** Medium · **Confirmed**
- **Files:** `app/(app)/(tabs)/notifications.tsx:62-68`, `app/(app)/(tabs)/_layout.tsx:71` (`tabBarBadge: 3`).
- **Evidence:** Notifications live in `useState(NOTIFICATIONS)` seeded from a module constant; `markAllRead` mutates local state only, so unread status resets every time the screen remounts. The tab "Alerts" badge is hardcoded to `3` and never reflects actual unread count.
- **Risk:** Misleading state — the badge and read/unread status lie to the user. Low data-integrity impact but erodes trust in a "professional" product.
- **Recommended fix:** Move notifications into a context with AsyncStorage persistence and derive the tab badge from unread count. See `plans/007`.
- **Verification:** Manual — mark all read, navigate away and back, badge/state stay consistent.

### M4 — No crash/error monitoring or structured logging
- **Severity:** Medium · **Confirmed (absence)**
- **Files:** project-wide (no Sentry/observability integration; no logger).
- **Evidence:** No crash reporter, no error telemetry, no structured logging. `production-readiness.md` requires monitoring and meaningful logs.
- **Risk:** In production, H1/H2/H3-class failures would be invisible — no signal that users are hitting white screens or losing data.
- **Recommended fix:** Add an error-reporting client (e.g. Sentry via `@sentry/react-native`, or EAS-native crash insights) wired into the root error boundary, with a logging policy that never records tokens/PII (`security.md`). See `plans/008`.
- **Verification:** Trigger a handled boundary error and confirm it reports in a test/staging DSN.

### M5 — No CI; `npm audit` reports 21 moderate advisories (dev/build tooling)
- **Severity:** Medium · **Confirmed**
- **Files:** no `.github/` directory; `package-lock.json` dependency tree.
- **Evidence:** `npm audit` (§20) → 21 moderate vulnerabilities, all in **transitive dev/build tooling** (`js-yaml` via `babel-jest`/`@istanbuljs`, `postcss` via `@expo/metro-config`, `uuid` via `xcode`/config-plugins). Every fix is gated behind a **breaking** upgrade (`react-native@0.86`, `expo@56`). No CI runs `tsc`/`lint`/`export`/`audit` on push.
- **Risk:** These are build-time, not runtime-bundle, exploits — low direct risk — but they are unmonitored, and nothing prevents a regression in `tsc`/`lint`/`export` from landing.
- **Recommended fix:** Add GitHub Actions for typecheck/lint/export/test, Dependabot, CodeQL, and secret scanning. Do **not** run `npm audit fix --force` (would break the SDK). Track the advisories and clear them via the normal Expo SDK upgrade cycle. See `plans/006`.
- **Verification:** CI green on a PR; Dependabot opens PRs.

### M6 — UI copy claims server sync that does not exist
- **Severity:** Medium · **Confirmed**
- **Files:** `app/(app)/(tabs)/report.tsx:117-120`, `app/(app)/issues/new.tsx:594-596`.
- **Evidence:** "Reports are synced to the project management server once submitted" and "The responsible team will receive a notification after backend integration." There is no network layer; nothing is synced or notified.
- **Risk:** Users may believe data left the device / a team was alerted when neither happened — a safety-relevant misrepresentation for defect/safety reports.
- **Recommended fix:** Soften copy to reflect local-only status until the backend exists (e.g. "saved on this device"). Low effort; fold into `plans/005` (copy/consistency).
- **Verification:** Manual copy review.

---

## 7. Low-Priority Improvements

| ID | Finding | Files | Fix |
|----|---------|-------|-----|
| L1 | Hardcoded `#F5A623` for "At Risk" bypasses design tokens (duplicated literal) | `src/components/StatusBadge.tsx:13`, `app/(app)/(tabs)/projects.tsx:87` | Add `colors.atRisk` (or reuse `colors.warning`) token; replace both literals. `plans/005` |
| L2 | One-off gradient literal `#0E131A` | `app/index.tsx:19` | Promote to a theme token. `plans/005` |
| L3 | Missing `accessibilityLabel` on a couple of icon-only controls | `app/(auth)/login.tsx:148-158` (password eye toggle), `app/(app)/(tabs)/projects.tsx:111` (clear search) | Add labels. `plans/005` |
| L4 | No reduced-motion consideration for navigation/decoration animations | `app/_layout.tsx`, `app/(app)/_layout.tsx`, `app/index.tsx` | Respect `AccessibilityInfo.isReduceMotionEnabled`. `plans/005` |
| L5 | Unbounded local storage growth (full-collection rewrite each save) | `src/context/*`, `src/utils/*storage.ts` | Acceptable now; revisit with pagination/archival when volume warrants (`production-readiness.md` "no premature complexity"). |
| L6 | Web static export exposes `_sitemap` and group-prefixed routes (`/(app)/home`, `/(auth)/login`) | build output (§20) | Default Expo behavior; navigation uses clean paths. Disable `_sitemap`/static export for production web if web is shipped. |
| L7 | `generateId`/`generateReferenceNumber` have a theoretical duplicate race from stale `existing` | `src/context/IssueContext.tsx:25-55`, `src/context/DailyReportContext.tsx:25-42` | Derive sequence from latest state (functional updater) or accept; single-user, low risk. Folds into `plans/002`. |
| L8 | Leftover `app-example/` Expo template scaffolding on disk | `app-example/**` | Gitignored and `tsconfig`-excluded (not shipped); delete locally to reduce noise. |
| L9 | Possibly-unused template dependencies | `package.json` (`expo-symbols`, `expo-web-browser`, `expo-haptics`, `expo-system-ui`) | Verify usage, then prune per dependency-review (`production-readiness.md`). Confirm before removing — some are referenced by the Expo template/runtime. |

---

## 8. Security Findings

Mapped against `.claude/rules/security.md`. The app is a **public client**, so the rules that apply *now* are the mobile ones; backend rules are **[Backend]** and not yet applicable.

- **C2 — Hardcoded demo credentials in bundle** (see §4). Mobile rule: secrets out of the bundle. The demo password is not a real secret but is a committed credential; treat as burned. **Required action documented in C2.**
- **C1 — No auth/authz; deep-link bypass** (see §4). Mobile rule: use SecureStore for tokens *once auth exists*; today there is no token, which is itself the gap.
- **Positive — no secrets in source/config:** `EXPO_PUBLIC_*` not misused; `app.json` carries only non-secret config; `.env.example` placeholders only; comprehensive `.gitignore`. **No keys, tokens, passwords (other than the demo string), certificates, or `.env` files are tracked by Git.**
- **Positive — no sensitive logging:** zero `console.*`; nothing logs tokens/PII.
- **Positive — AsyncStorage holds only non-sensitive data** (issues/reports/UI state), consistent with the "AsyncStorage is unencrypted, non-secret only" rule. **Caveat:** construction defect/safety reports may include site-sensitive details and photo paths; once a backend and real users exist, evaluate whether at-rest encryption (SecureStore/SQLCipher) is warranted for report bodies.
- **Backend-dependent rules not yet met (expected):** server-side validation, authorization by role *and* resource ownership, rate limiting on login/forms/uploads/AI, safe generic error responses, upload validation (size/MIME/magic bytes) + UUID renaming, CORS allowlist, parameterized SQL, AI token budgets/timeouts/output validation. All **[Backend]**, all currently absent because there is no backend. Documented here so they are not forgotten at backend time.
- **Client validation is UX-only (correct understanding):** the forms validate for feedback; this must be re-enforced server-side later.

**No secret values are printed in this report.**

---

## 9. Expo Router Findings

- **Route groups used correctly:** `(app)`/`(auth)`/`(tabs)` are organizational; user-facing navigation uses clean paths (`/home`, `/login`, `/issues/[id]`), satisfying "never include route-group names in public URLs." (Confirmed across all `router.push/replace` call sites.)
- **`router.replace`/`push` targets are valid and typed:** verified against the file tree (`/login`, `/home`, `/issues`, `/issues/new`, `/issues/[id]`, `/daily-reports`, `/daily-reports/new`, `/daily-reports/[id]`, `/projects/[id]`, `/notifications`). No broken or duplicated public paths in navigation calls.
- **`[id]` screens handle the not-found case** with a dedicated fallback UI (`issues/[id]`, `projects/[id]`) — good.
- **L6 (web static export):** `_sitemap` and group-prefixed variants (`/(app)/home`, `/(auth)/login`) are emitted by `expo export` static web output. This is Expo's default and not a navigation bug, but if web is a production target, disable the sitemap/static listing. **Low.**
- **No deep-link/scheme issues found:** `scheme: "siteflowmobile"` is set; no group names leak into deep-link targets in code.

---

## 10. Storage and Persistence Findings

- **H3 — Unvalidated deserialization** (see §5): the dominant storage risk.
- **H1 — Stale-closure submit race** (see §5): persistence-adjacent data-integrity bug.
- **Positive — seed-once + null/empty distinction:** `load*` returns `null` when nothing was ever stored (caller seeds) vs `[]` when stored-but-unreadable (caller does *not* re-seed). This correctly prevents re-seeding over user data and avoids the classic "duplicated seed on every launch" bug. **No seed duplication found.**
- **Positive — write/parse failures swallowed safely:** `save*`/`clear*` try/catch keeps in-memory state authoritative and avoids startup crashes.
- **M1 — Image URI persistence** (see §6).
- **No schema version key:** there is no `*_v1`-style migration metadata inside the payload (only in the storage *key* name). Future model changes will hit H3 head-on. Add a version + migration path (`plans/002`).
- **L5 — Unbounded growth / full-rewrite per save:** every mutation re-serializes the entire collection. Fine at demo scale; note for later.

---

## 11. TypeScript Findings

- **Excellent baseline:** `strict: true`; **no** `any`, `@ts-ignore`, or `@ts-expect-error` anywhere in `app/` or `src/` (repo-wide grep). `tsc --noEmit` passes (§20).
- **Unsafe assertions (the one real gap):** `parsed as ConstructionIssue[]` / `as DailySiteReport[]` in the two storage modules (H3) defeat the type system at the trust boundary. These are the only assertions of concern; replace with validated parsing.
- **Good use of discriminated/narrowed types:** `IssueFormData` (validated, non-null category/severity) vs `IssueDraftInput` (nullable) is a clean separation; the `isCategory` type guard in `issues/new.tsx:89-91` is the right pattern — extend it to storage.
- **Path alias `@/*`** configured and used consistently.

---

## 12. Error Handling Findings

- **H2 — No error boundaries** (see §5): the headline gap.
- **Utilities degrade gracefully:** date utils return `'—'` on bad input; storage utils fall back to `[]`. Good defensive style.
- **Forms handle leave/cancel/permission paths**, but **no try/catch around `addIssue`/`addReport`/`saveDraft` persistence calls** in the handlers — if `persist` ever rejected, `finally { setIsSaving(false) }` runs but the user gets no error UI (storage currently swallows errors, so this is latent). Add user-visible error states for submit failures (`plans/003`).
- **No global/unhandled-rejection handler** for surfacing unexpected failures to monitoring (ties to M4/`plans/008`).
- **Missing-state coverage is otherwise good:** lists/detail screens implement empty states and not-found states; loading is modeled via `isLoading` in both contexts (though see §15 — it is not consumed by the list screens).

---

## 13. Accessibility Findings

- **Strong baseline:** most icon-only buttons have `accessibilityLabel`; selection cards/toggles set `accessibilityRole="button"` and `accessibilityState={{ selected }}`; status uses **text + color** (badges render labels), satisfying "don't communicate state by color alone." (Confirmed in `StatusBadge`, `notifications.tsx`, form toggles.)
- **L3 gaps:** the login password show/hide eye toggle (`login.tsx:148`) and the projects clear-search button (`projects.tsx:111`) have no `accessibilityLabel`. (The issues-list clear-search *does* — inconsistency.)
- **L4 — reduced motion:** fade/slide route transitions and the splash do not consult `AccessibilityInfo.isReduceMotionEnabled`. Minor; address for vestibular-sensitivity users.
- **Touch targets:** the eye toggle is a 20px icon with `padding: 4` but `hitSlop` of 8 → ~44px effective; acceptable. Filter chips are small but within reason. No target found below the effective 44px threshold once hitSlop is counted.
- **Live regions:** form error text appears inline but is not announced via `accessibilityLiveRegion`/`AccessibilityInfo.announceForAccessibility`. Optional enhancement.

---

## 14. UI and Design Consistency Findings

- **L1 — Hardcoded `#F5A623`** for "At Risk" duplicated in `StatusBadge.tsx:13` and `projects.tsx:87`, bypassing `colors`. The palette already has `colors.warning = #F5B942`; either reuse it or add a dedicated `colors.atRisk` token. (Other status colors correctly use tokens.)
- **L2 — `#0E131A` gradient literal** in the splash.
- **Restraint mostly respected:** gradients are limited to the splash and the home header (subtle, two-stop) — within the "avoid excessive gradients/glassmorphism" guidance, borderline but acceptable. Modal backdrops use repeated `rgba(0,0,0,0.92)`/`0.5` literals — candidates for tokenizing but not violations.
- **Dark industrial system preserved** and consistent across screens.
- **M6 — misleading sync copy** (see §6) is also a consistency/professionalism issue.
- **Static vs live data mismatch on home:** "Active Projects: 4" and "Safety Alerts: 2" and the "Today's Priorities" list are hardcoded while "Open Issues"/"Workers Today" are live — visually identical tiles with different truthfulness. Note for when projects move into the dynamic layer.

---

## 15. Performance Findings

- **List virtualization is correct** (no nested vertical `VirtualizedList`; `ListHeaderComponent` pattern; stable keys). No `VirtualizedList should never be nested` warning path found.
- **`.map()` inside `ScrollView`** on `home`, `projects`, `report`, `notifications`, `profile`, and the two detail screens — acceptable because these are small, bounded, mostly-static lists. If `projects`/`notifications` become large dynamic datasets, migrate to `FlatList`.
- **Inline closures / inline `style={[...]}` arrays** in `renderItem` and list maps create new references each render. **React Compiler is enabled**, which mitigates much of this; low priority. Memoizing `IssueCard`/`DailyReportCard`/`ProjectCard` with `React.memo` and hoisting static styles would still help large lists (`plans/007`).
- **Loading states not consumed:** both contexts expose `isLoading`, but the list/home screens don't render a loading/skeleton state during first hydration — brief empty-state flash on cold start. Low/Medium UX; fold into `plans/007`/`plans/003`.
- **Splash uses a fixed 1500ms timer** (cleaned up) — artificial delay, not a perf bug, but consider gating on actual readiness.
- **No obvious render hot-loops, no unbounded effects, no timers without cleanup** found (the splash timer and the `BackHandler` subscriptions are all cleaned up).

---

## 16. Dependency Findings

- **SDK alignment perfect:** `expo-doctor` 18/18, including "packages match versions required by installed Expo SDK" and "no duplicate dependencies." Versions are SDK-54-pinned (`expo install`-style ranges).
- **M5 — 21 moderate `npm audit` advisories**, all transitive dev/build tooling, all fix-gated behind breaking SDK upgrades. **Do not `audit fix --force`.** Track and clear on the normal SDK cadence.
- **L9 — candidate unused deps** (`expo-symbols`, `expo-web-browser`, `expo-haptics`, `expo-system-ui`) — verify before pruning.
- **No deprecated Expo APIs detected:** `ImagePicker` uses the current `mediaTypes: ['images']` array form (not the deprecated `MediaTypeOptions`); `expo-router`, `expo-image`, `expo-linear-gradient`, `expo-haptics` usage matches SDK 54 docs.
- **No incompatible packages** for SDK 54 (per `expo-doctor` React Native Directory validation).

---

## 17. Testing Gaps

Against `testing.md`, the following **required** coverage is entirely missing (H4):

- **Business logic / pure functions:** `src/utils/date.ts` (date formatting, `calculateWorkDuration`, `isWithinLastDays`), `src/utils/issueDisplay.ts`, `src/types/dailyReport.ts:totalWorkers`, reference-number generation.
- **Storage utilities (5 cases each):** success, empty/no-data (`null`), malformed/corrupt (non-array **and** bad-element — would catch H3), underlying read **and** write failing — for `issueStorage.ts` and `dailyReportStorage.ts`.
- **Context providers:** state transitions through actions and persistence round-trip — the **H1 submit/delete-draft behavior** is the priority regression test.
- **Forms:** invalid-input rejection and **double-submit** protection (M2).
- **Critical navigation flows:** create-issue and file-daily-report happy paths (integration/E2E).

`plans/004` stands up the runner + the first high-value slice (date utils, storage 5-cases, H1 context test).

---

## 18. Offline Readiness

- **Local-first today:** all dynamic data (issues, daily reports) reads/writes AsyncStorage, so the app **functions fully offline** for stored data — a genuine strength for field/construction use where connectivity is poor.
- **No network layer yet,** so there is nothing to queue/retry; an offline sync queue is **not** needed until the backend exists (avoid premature complexity per `production-readiness.md`).
- **Gaps to close when the backend lands:** an outbound mutation queue with retry/backoff, conflict resolution for the duplicate-report case, and an explicit offline indicator. The Profile screen already stubs an "Offline Data" row — wire it then.
- **M6 copy** currently implies online sync; fix now so offline behavior isn't misrepresented.

---

## 19. Production and Monitoring Gaps

Against `production-readiness.md`:

- **Monitoring:** none — no crash reporting, error rates, or key metrics (M4). **Required.** `plans/008`.
- **Logging:** no structured logging (and must stay PII/token-free). `plans/008`.
- **CI:** none (M5). `plans/006`.
- **Release/rollback planning:** no `eas.json`, build profiles, channels, or documented rollback/OTA-update strategy. `plans/008`.
- **App versioning:** `version: 1.0.0` set, but no automated build-number/version management or store metadata. `plans/008`.
- **DB migrations / backup / restore:** **[Backend]** — N/A until a backend exists; the on-device analog (storage schema versioning + export) is covered by `plans/002`.
- **Documentation:** `CLAUDE.md`/`AGENTS.md`/rules are excellent; missing are operational docs (architecture, env config, release runbook) — produced incrementally by these plans.

---

## 20. Verification Command Results

All commands were executed in the repo root on 2026-06-26. Results are recorded exactly.

| # | Command | Result | Detail |
|---|---------|--------|--------|
| 1 | `git status` | **passed** | On `chore/production-foundation`; "nothing to commit, working tree clean" (before this audit's doc writes). |
| 2 | `git diff --check` | **passed** | No whitespace/conflict errors; empty output. |
| 3 | `npm audit` | **completed with findings (exit 1)** | **21 moderate** vulnerabilities, all transitive dev/build tooling (`js-yaml`←`babel-jest`/`@istanbuljs`; `postcss`←`@expo/metro-config`; `uuid`←`xcode`/config-plugins). All fixes require **breaking** upgrades (`react-native@0.86`, `expo@56`). `npm audit fix` not run, per instructions. |
| 4 | `npx expo-doctor@latest --verbose` | **passed (exit 0)** | expo-doctor v1.19.10 — **18/18 checks passed. No issues detected.** |
| 5 | `npx tsc --noEmit` | **passed (exit 0)** | No type errors. |
| 6 | `npm run lint` (`expo lint`) | **passed (exit 0)** | No lint errors or warnings. |
| 7 | `npx expo export --platform web` | **passed (exit 0)** | React Compiler enabled; bundled 831 modules; web entry 1.84 MB; 39 static routes exported to `dist/` (incl. group-prefixed + `_sitemap`, see L6). |

**Distinctions:**
- **Passed (executed successfully):** 1, 2, 4, 5, 6, 7.
- **Completed with findings (non-zero exit, ran fine):** 3 (`npm audit`, exit 1 by design when advisories exist).
- **Could not run:** none.
- **Network/external-service error:** none. (`expo-doctor` and `expo export` performed network/registry access without error; `expo-doctor` was fetched via `npx`.)
- **`npm test`:** **intentionally not run** — no test runner/script is configured (H4). Not invented.

No command's "passed" status is asserted without the exit code above.

---

## 21. Recommended Implementation Order

Ordered by risk-reduction per unit effort. Each maps to an independent plan in `plans/`.

1. **`plans/003` — Error boundaries & safe error handling** *(High, low-risk, unblocks everything else by containing crashes).* Do this first so subsequent fixes fail safe.
2. **`plans/002` — Storage & persistence hardening** *(fixes H1 draft-resurrection, H3 deserialization validation, M1 image persistence, schema versioning).* Highest data-integrity payoff.
3. **`plans/004` — Mobile test foundation** *(stands up the runner; locks in regression tests for the H1/H3 fixes).* Sequence right after/with 002 so the fixes get tests.
4. **`plans/001` — Critical security findings** *(remove demo creds, add auth context + route guard, SecureStore scaffolding, logging policy).* Required before any non-demo release.
5. **`plans/006` — GitHub security & CI workflows** *(typecheck/lint/export/test gates, Dependabot, CodeQL, secret scanning).* Makes all later work verifiable on PRs.
6. **`plans/005` — Accessibility & design consistency** *(L1–L4, M6 copy).* Low-risk polish.
7. **`plans/007` — Performance & rendering** *(M2 ref-based submit guard, M3 notification persistence, memoization, loading states).*
8. **`plans/008` — Monitoring & release readiness** *(crash reporting, EAS profiles/channels, versioning, release/rollback runbook).*

Plans 001–008 are each independently executable; the order above is a recommendation, not a hard dependency, except that **004 should follow 002** (so it can test the fixes) and **006 is most useful once there is something to test (after 004)**.

---

## 22. Definition of Production Ready for SiteFlow AI

SiteFlow AI Mobile is "production ready" when, in addition to a green `tsc`/`lint`/`expo-doctor`/`export`:

**Security**
- Real authentication with sessions; tokens stored only in `expo-secure-store`; `(app)` routes guarded against unauthenticated/deep-link access.
- No hardcoded credentials or secrets in the bundle or Git; `EXPO_PUBLIC_*` carries non-secret config only.
- Backend enforces server-side validation, authorization by **role and resource ownership**, rate limiting (login/forms/uploads/AI), safe generic error responses, upload validation (size/MIME/magic-bytes + UUID rename), CORS allowlist, parameterized SQL, and AI token budgets/timeouts/output validation.

**Correctness & data integrity**
- No stale-closure/race data bugs (H1 fixed and regression-tested).
- All persisted data validated on load with versioned, reversible migrations (H3 + schema versioning).
- Evidence photos persist reliably across relaunch/reinstall (M1).

**Resilience**
- Root + route error boundaries with recovery UI (H2); submit/load failures surface user-visible error states; no white-screen crash paths.
- Crash/error monitoring and structured, PII/token-free logging in production (M4).

**Quality gates**
- Test runner configured; required coverage per `testing.md` (utils, storage 5-cases, context transitions/persistence, form validation/double-submit, critical-flow integration) (H4).
- CI runs typecheck/lint/export/test on every PR; Dependabot/CodeQL/secret-scanning enabled (M5).

**Accessibility & UX**
- All icon-only controls labeled; no color-only state; reduced-motion respected; loading/empty/error/offline states on every data screen.

**Operations**
- EAS build/submit profiles + update channels; managed versioning/build numbers; documented, tested **rollback** and OTA-update strategy; backup/restore validated once a backend/data store exists.
- Architecture, configuration, and release-runbook documentation maintained.

Until the items in §4–§5 (and the backend security model in §8) are met, the app should ship only as a clearly-labeled **demo/pilot**, never as a credential-bearing production release.
