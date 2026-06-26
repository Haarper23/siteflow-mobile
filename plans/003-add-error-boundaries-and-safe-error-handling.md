# 003 — Error Boundaries and Safe Error Handling Implementation Plan

> **For agentic workers:** Use `superpowers:subagent-driven-development` or `superpowers:executing-plans`. Steps use `- [ ]`. Test steps assume the runner from `plans/004`; if absent, verify via `tsc`/`lint`/`export` + manual.

**Goal:** Ensure no render error or persistence failure white-screens the app — add a root error boundary, route-level boundaries for data-driven stacks, and user-visible error states for submit/load failures.

**Architecture:** A reusable `<ScreenError>` fallback component plus an Expo Router `ErrorBoundary` export at the root and on the `(app)` data stacks. Submit handlers gain try/catch with a surfaced error message. Contexts expose a `loadError` flag so screens can render an error state instead of a misleading empty state.

**Tech Stack:** Expo SDK 54, Expo Router 6 (`ErrorBoundary` export convention), React 19.

## Global Constraints

- Support loading, empty, error, and offline states for data screens. — `.claude/rules/mobile-engineering.md`
- Production errors must not expose stack traces/infra details to users (show safe, generic copy). — `.claude/rules/security.md`
- Use design tokens (`src/theme/colors.ts`); no hardcoded colors. — `.claude/rules/mobile-engineering.md`
- No `any`/`@ts-ignore`. — root `CLAUDE.md`
- Branch (`fix/...`); no commit/push without approval. — `.claude/rules/git-workflow.md`

## Confirmed Findings Addressed

- **H2** — No error boundaries; one render error crashes the whole app.
- Error-handling gaps in submit/load paths (audit §12).
- Loading-state-not-consumed flash on cold start (audit §15) — partially.

## Files Affected

- Create: `src/components/ScreenError.tsx` — branded fallback UI.
- Modify: `app/_layout.tsx` — export root `ErrorBoundary`.
- Modify: `app/(app)/_layout.tsx` — export route `ErrorBoundary`.
- Modify: `src/context/IssueContext.tsx` — add `loadError` flag.
- Modify: `src/context/DailyReportContext.tsx` — add `loadError` flag.
- Modify: `app/(app)/issues/new.tsx`, `app/(app)/daily-reports/new.tsx` — submit try/catch + error surface.
- Test: `src/components/__tests__/ScreenError.test.tsx`.

## Interfaces

- `ScreenError.tsx` **produces:** `export function ScreenError(props: { title?: string; message?: string; onRetry?: () => void }): JSX.Element`.
- Expo Router boundary export **produces:** `export function ErrorBoundary({ error, retry }: ErrorBoundaryProps)` in the two layouts.
- `IssueContext`/`DailyReportContext` **produce (added):** `loadError: boolean` on the context value.

---

### Task 1: Reusable error fallback component

**Files:**
- Create: `src/components/ScreenError.tsx`
- Test: `src/components/__tests__/ScreenError.test.tsx`

- [ ] **Step 1: Write a failing render test**

```tsx
// src/components/__tests__/ScreenError.test.tsx
import { render, fireEvent } from '@testing-library/react-native';
import React from 'react';
import { ScreenError } from '@/src/components/ScreenError';

test('renders message and fires retry', () => {
  const onRetry = jest.fn();
  const { getByText } = render(<ScreenError message="Boom" onRetry={onRetry} />);
  fireEvent.press(getByText('Try again'));
  expect(onRetry).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npm test -- ScreenError`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement the component (tokens only)**

```tsx
// src/components/ScreenError.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '@/src/theme/colors';

interface ScreenErrorProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ScreenError({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  onRetry,
}: ScreenErrorProps) {
  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name="alert-circle-outline" size={48} color={colors.danger} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry !== undefined && (
        <TouchableOpacity style={styles.button} onPress={onRetry} accessibilityRole="button" accessibilityLabel="Try again">
          <Text style={styles.buttonText}>Try again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 12 },
  title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, textAlign: 'center', marginTop: 8 },
  message: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  button: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: colors.primary, borderRadius: 12 },
  buttonText: { fontSize: 15, fontWeight: '700', color: colors.background },
});
```

- [ ] **Step 4: Run to PASS + commit**

```bash
npm test -- ScreenError
git add src/components/ScreenError.tsx src/components/__tests__/ScreenError.test.tsx
git commit -m "feat(errors): add reusable ScreenError fallback"
```

---

### Task 2: Root and route error boundaries

**Files:**
- Modify: `app/_layout.tsx`
- Modify: `app/(app)/_layout.tsx`

- [ ] **Step 1: Export a root `ErrorBoundary`**

Add to `app/_layout.tsx` (Expo Router renders this automatically when a child throws):

```tsx
import type { ErrorBoundaryProps } from 'expo-router';
import { ScreenError } from '@/src/components/ScreenError';

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  // Safe, generic copy — do not surface error.message/stack to users in production.
  return <ScreenError message="The app hit an unexpected problem." onRetry={retry} />;
}
```

- [ ] **Step 2: Export a route `ErrorBoundary` on the data stack**

Add the same export to `app/(app)/_layout.tsx` so failures inside the authed area recover locally without unmounting the whole app.

- [ ] **Step 3: Manual verification**

Temporarily add `throw new Error('test')` to a screen body, run `npx expo start --web`, confirm the fallback (not a white screen) appears and "Try again" recovers. Remove the throw.

- [ ] **Step 4: Typecheck + export + commit**

```bash
npx tsc --noEmit && npx expo export --platform web
git add app/_layout.tsx "app/(app)/_layout.tsx"
git commit -m "feat(errors): add root and route error boundaries (H2)"
```

---

### Task 3: Context load-error flag + screen error states

**Files:**
- Modify: `src/context/IssueContext.tsx`
- Modify: `src/context/DailyReportContext.tsx`
- Modify: `app/(app)/issues/index.tsx`, `app/(app)/daily-reports/index.tsx`

- [ ] **Step 1: Track load failure in the contexts**

In each context's `load`, set a `loadError` state. Since `load*` currently swallows errors and returns `[]`, distinguish a genuine read failure by having the storage `load*` rethrow OR by adding a sibling that reports failure. Minimal approach: wrap the `await loadIssues()` call so that a thrown error sets `loadError = true`.

```tsx
const [loadError, setLoadError] = useState(false);
const load = useCallback(async () => {
  setIsLoading(true);
  setLoadError(false);
  try {
    const stored = await loadIssues();
    if (stored === null) { setAllIssues(MOCK_ISSUES); await saveIssues(MOCK_ISSUES); }
    else { setAllIssues(stored); }
  } catch {
    setLoadError(true);
  } finally {
    setIsLoading(false);
  }
}, []);
```

Add `loadError` to the context value + memo deps.

- [ ] **Step 2: Render an error state in the list screens**

In `issues/index.tsx`, read `loadError` from `useIssues()` and short-circuit:

```tsx
if (loadError) {
  return <ScreenError title="Couldn't load issues" message="Your saved issues could not be read." onRetry={refreshIssues} />;
}
```

Mirror in `daily-reports/index.tsx` using `refreshReports`.

- [ ] **Step 3: Typecheck + lint + commit**

```bash
npx tsc --noEmit && npm run lint
git add src/context/IssueContext.tsx src/context/DailyReportContext.tsx "app/(app)/issues/index.tsx" "app/(app)/daily-reports/index.tsx"
git commit -m "feat(errors): surface storage load failures as an error state"
```

---

### Task 4: Submit-failure handling in forms

**Files:**
- Modify: `app/(app)/issues/new.tsx`, `app/(app)/daily-reports/new.tsx`

- [ ] **Step 1: Wrap submit/draft persistence in try/catch with a visible message**

In both `handleSubmit` and `handleSaveDraft`, add a `catch` that surfaces a generic alert and keeps the user on the form:

```tsx
try {
  // ...existing submit/save...
} catch {
  Alert.alert('Save failed', 'We could not save your report. Please try again.');
} finally {
  setIsSaving(false);
}
```

- [ ] **Step 2: Typecheck + lint + export**

Run: `npx tsc --noEmit && npm run lint && npx expo export --platform web`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/issues/new.tsx" "app/(app)/daily-reports/new.tsx"
git commit -m "feat(errors): user-visible failure handling on submit/save"
```

---

## Security Considerations

- Fallback copy is generic; no stack traces or storage internals shown to users (`security.md`). When monitoring is added (`plans/008`), report the real error to the telemetry sink, not the UI.

## Testing Requirements

- `ScreenError` renders message + retry (Task 1).
- Manual: a thrown child renders the boundary, not a white screen (Task 2).
- Context `loadError` true when `load*` throws → screen renders error state (extend context tests from `plans/004`).

## Acceptance Criteria

- A render error anywhere shows the branded fallback with working "Try again", never a white/blank screen.
- A storage read failure shows an error state (not a misleading empty list).
- Submit/save failures show a generic alert and leave the form editable.
- `tsc`, `lint`, `expo export` green.

## Verification Commands

```bash
npx tsc --noEmit
npm run lint
npm test
npx expo export --platform web
```

## Rollback Considerations

- All additive; revert the `ErrorBoundary` exports and `loadError` wiring to restore prior behavior. No data migration involved.

## Dependencies

- None (no new packages). Test steps depend on `plans/004`.

## Estimated Implementation Risk: **Low**
(Additive resilience; does not alter data flow.)
