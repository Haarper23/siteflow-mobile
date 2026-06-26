# 004 — Mobile Test Foundation Implementation Plan

> **For agentic workers:** Use `superpowers:subagent-driven-development` or `superpowers:executing-plans`. Steps use `- [ ]`. This plan stands up the test runner the other plans depend on — execute it early.

**Goal:** Configure a Jest + React Native Testing Library runner for Expo SDK 54 and land a first high-value test slice (date utils, both storage modules' five mandated cases, and the H1 context regression).

**Architecture:** Use `jest-expo` (the Expo-maintained preset) with `@testing-library/react-native`. Add a `test` script. Tests live in `__tests__/` folders beside the code they cover. AsyncStorage and Expo native modules are mocked.

**Tech Stack:** Expo SDK 54, Jest via `jest-expo`, `@testing-library/react-native`, `react-test-renderer` (React 19-matched).

## Global Constraints

- Add test deps with `npm install --save-dev` (pure-JS dev tooling) — `jest-expo` versioning follows the SDK; install the SDK-matched version. — `.claude/rules/mobile-engineering.md`
- Do **not** disable/skip tests to go green; fix root causes. — `.claude/rules/testing.md`
- No `any`/`@ts-ignore`. — root `CLAUDE.md`
- Storage utilities require success/empty/malformed/failure tests. — `.claude/rules/testing.md`
- Branch (`test/...`); no commit/push without approval. — `.claude/rules/git-workflow.md`

## Confirmed Findings Addressed

- **H4** — No automated tests and no test runner.
- Provides the runner consumed by `plans/001`, `002`, `003`, `005`, `007`.

## Files Affected

- Modify: `package.json` — `test` script + devDependencies + `jest` config block (or separate `jest.config.js`).
- Create: `jest.config.js` — preset + setup + transform-ignore.
- Create: `jest.setup.js` — global mocks (AsyncStorage, reanimated, gesture-handler).
- Create: `src/utils/__tests__/date.test.ts`.
- (Storage/context test files are authored in `plans/002`; this plan guarantees the harness runs them.)

## Interfaces

- **Produces:** an `npm test` script that runs `jest`; a green baseline suite. Other plans **consume** this by adding `*.test.ts(x)` files.

---

### Task 1: Install and configure the runner

**Files:**
- Modify: `package.json`
- Create: `jest.config.js`, `jest.setup.js`

- [ ] **Step 1: Install dev dependencies (SDK-matched)**

Run: `npm install --save-dev jest-expo jest @testing-library/react-native react-test-renderer@19.1.0`
Expected: installed; `expo-doctor` still green (these are dev-only).

- [ ] **Step 2: Add the `test` script**

In `package.json` `scripts`, add:

```json
"test": "jest"
```

- [ ] **Step 3: Create `jest.config.js`**

```js
// jest.config.js
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@react-native-async-storage/.*))',
  ],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}'],
};
```

- [ ] **Step 4: Create `jest.setup.js` with native mocks**

```js
// jest.setup.js
require('@testing-library/react-native/extend-expect');

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Quiet reanimated/gesture-handler in the test env if imported transitively.
jest.mock('react-native-reanimated', () => {
  try { return require('react-native-reanimated/mock'); } catch { return {}; }
});
```

- [ ] **Step 5: Commit config**

```bash
git add package.json package-lock.json jest.config.js jest.setup.js
git commit -m "test: configure jest-expo + RNTL runner"
```

---

### Task 2: First passing test — date utils

**Files:**
- Create: `src/utils/__tests__/date.test.ts`

- [ ] **Step 1: Write tests against real behavior**

```ts
// src/utils/__tests__/date.test.ts
import { formatDisplayDate, calculateWorkDuration, isWithinLastDays, getTodayISODate } from '@/src/utils/date';

test('formatDisplayDate handles invalid input safely', () => {
  expect(formatDisplayDate(null)).toBe('—');
  expect(formatDisplayDate('not-a-date')).toBe('—');
});

test('formatDisplayDate formats an ISO date', () => {
  expect(formatDisplayDate('2026-06-25T00:00:00.000Z')).toMatch(/2026/);
});

test('calculateWorkDuration computes hours/minutes and handles overnight', () => {
  expect(calculateWorkDuration('07:30', '17:30')).toBe('10h');
  expect(calculateWorkDuration('22:00', '06:00')).toBe('8h');
  expect(calculateWorkDuration('bad', '06:00')).toBe('—');
});

test('isWithinLastDays is inclusive of today', () => {
  expect(isWithinLastDays(getTodayISODate(), 7)).toBe(true);
});
```

- [ ] **Step 2: Run to PASS**

Run: `npm test -- date`
Expected: PASS (these test existing, correct behavior).

- [ ] **Step 3: Run the whole suite**

Run: `npm test`
Expected: PASS (all green).

- [ ] **Step 4: Commit**

```bash
git add src/utils/__tests__/date.test.ts
git commit -m "test: cover date utility behavior"
```

---

### Task 3: Confirm storage/context tests run under the harness

**Files:**
- (Depends on `plans/002` test files, if already present.)

- [ ] **Step 1: If `plans/002` is done, run its suites**

Run: `npm test -- Storage && npm test -- Context`
Expected: PASS. If `plans/002` is not yet executed, skip — this step exists to confirm the harness executes those files when they land.

- [ ] **Step 2: Document the test command in the README**

Add a short "Testing" section to `README.md`: `npm test` runs the Jest suite; tests live in `__tests__/` folders.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: document the test command"
```

---

## Security Considerations

- Test fixtures must not contain real secrets or PII (use obviously-fake values like `demo@example.com`).

## Testing Requirements

- The harness runs `.ts`/`.tsx` tests under `src/` and `app/`.
- Date-utils suite green (Task 2).
- Storage/context suites from `plans/002` execute and pass (Task 3, when present).

## Acceptance Criteria

- `npm test` exists and passes locally.
- AsyncStorage and reanimated are mocked so context/component tests run.
- No tests are skipped to achieve green.

## Verification Commands

```bash
npm install --save-dev jest-expo jest @testing-library/react-native react-test-renderer@19.1.0
npm test
npx tsc --noEmit
npm run lint
npx expo-doctor@latest
```

## Rollback Considerations

- Dev-only change; remove the `test` script, `jest.config.js`, `jest.setup.js`, and uninstall the dev deps to revert. No runtime/app behavior is affected.

## Dependencies

- None upstream. Downstream: `plans/001/002/003/005/007` rely on this runner for their test steps.

## Estimated Implementation Risk: **Low**
(Tooling-only; the main effort is getting `transformIgnorePatterns` right for SDK 54.)
