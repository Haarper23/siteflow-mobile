# Testing Rules

What requires tests in SiteFlow AI, and how to verify changes.

> **Note:** there is **no `test` script configured in `package.json` yet** and no test
> runner is installed. Do **not** add test dependencies as part of foundation/config
> work. The rules below define what *will* be tested once a runner is in place, and the
> verification commands you can run today.

## What requires tests

- **Business logic requires unit tests.** Pure functions for issues, daily reports,
  display formatting, and date handling (e.g. `src/utils/*`, `src/data/*`) should have
  unit coverage.
- **Storage utilities require success, empty, malformed, and failure tests.** For
  persistence helpers (e.g. `issueStorage.ts`, `dailyReportStorage.ts`): the happy path,
  empty/no-data, malformed/corrupt stored data, and the underlying read/write failing.
- **Context providers require state-transition and persistence tests.** For providers
  (e.g. `IssueContext`, `DailyReportContext`): state changes through their actions, and
  that persisted state hydrates and saves correctly.
- **Forms require validation and duplicate-submission tests.** Cover invalid input
  rejection and protection against double-submit / repeated taps.
- **Critical navigation flows require integration or E2E coverage.** Key user journeys
  (e.g. creating an issue, filing a daily report) should be exercised end-to-end.

## Future backend

When the backend exists, it requires:

- **Controller tests** (request/response, status codes, error handling).
- **Security tests** (authentication, authorization by role *and* resource ownership,
  rate limiting).
- **Repository tests** (data access correctness).
- **Testcontainers tests** (against a real database engine, not mocks, for integration).

## Discipline

- **Do not disable tests to make builds pass.** Skipping/`.skip`/commenting-out to get
  green is not allowed.
- **Fix the underlying cause** of a failure, not the symptom.
- **Every bug fix should include a regression test where practical** — a test that fails
  before the fix and passes after.

## Verification commands (run when relevant)

Derived from the current `package.json`:

```bash
npm run lint                # ESLint via expo lint
```

Additional Expo checks to run when applicable:

```bash
npx expo-doctor             # project and dependency health
npx tsc --noEmit            # TypeScript typecheck (no emit)
npm run lint                # lint
npm test                    # ONLY once a test runner is configured
npx expo export --platform web   # confirm the web bundle builds
```

Never claim a change works without running the checks relevant to it.
