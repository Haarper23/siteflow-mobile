# 005 — Accessibility and Design Consistency Implementation Plan

> **For agentic workers:** Use `superpowers:subagent-driven-development` or `superpowers:executing-plans`. Steps use `- [ ]`. These are small, low-risk edits; verify with `tsc`/`lint`/`export` and manual review.

**Goal:** Close the remaining accessibility gaps, replace hardcoded color literals with design tokens, respect reduced motion, and correct misleading "synced to server" copy.

**Architecture:** Add a token for the "At Risk" status color, replace the two literal usages, add missing `accessibilityLabel`s, gate decorative/transition animation on `AccessibilityInfo.isReduceMotionEnabled`, and soften copy to reflect local-only persistence.

**Tech Stack:** Expo SDK 54, React Native (`AccessibilityInfo`), existing `src/theme/colors.ts`.

## Global Constraints

- Use design tokens; add a token rather than a one-off literal. — `.claude/rules/mobile-engineering.md`
- Add accessible labels to icon-only buttons; don't communicate state by color alone. — `.claude/rules/mobile-engineering.md`
- Preserve the dark industrial system; animations must be purposeful. — `.claude/rules/mobile-engineering.md`
- No `any`/`@ts-ignore`. — root `CLAUDE.md`
- Branch (`fix/...`); no commit/push without approval. — `.claude/rules/git-workflow.md`

## Confirmed Findings Addressed

- **L1** — Hardcoded `#F5A623` (duplicated) bypasses tokens.
- **L2** — `#0E131A` gradient literal in the splash.
- **L3** — Missing `accessibilityLabel` on password eye toggle + projects clear-search.
- **L4** — No reduced-motion consideration.
- **M6** — UI copy claims server sync that does not exist.

## Files Affected

- Modify: `src/theme/colors.ts` — add `atRisk` (and `gradientTop`) tokens.
- Modify: `src/components/StatusBadge.tsx:13` — use the token.
- Modify: `app/(app)/(tabs)/projects.tsx:87` — use the token.
- Modify: `app/index.tsx:19` — use the gradient token.
- Modify: `app/(auth)/login.tsx:148-158` — label the eye toggle.
- Modify: `app/(app)/(tabs)/projects.tsx:111` — label clear-search.
- Modify: `app/_layout.tsx`, `app/(app)/_layout.tsx`, `app/index.tsx` — reduced-motion.
- Modify: `app/(app)/(tabs)/report.tsx:117-120`, `app/(app)/issues/new.tsx:594-596` — copy.
- Create: `src/hooks/useReducedMotion.ts` — reduced-motion hook.
- Test: `src/components/__tests__/StatusBadge.test.tsx`.

## Interfaces

- `colors.ts` **produces (added):** `colors.atRisk`, `colors.gradientTop`.
- `useReducedMotion.ts` **produces:** `useReducedMotion(): boolean`.

---

### Task 1: Add design tokens and replace literals

**Files:**
- Modify: `src/theme/colors.ts`, `src/components/StatusBadge.tsx`, `app/(app)/(tabs)/projects.tsx`, `app/index.tsx`
- Test: `src/components/__tests__/StatusBadge.test.tsx`

- [ ] **Step 1: Add tokens**

In `src/theme/colors.ts`, add inside the `colors` object:

```ts
atRisk: '#F5A623',
gradientTop: '#0E131A',
```

- [ ] **Step 2: Replace the `#F5A623` literals**

- `src/components/StatusBadge.tsx:13` → `AT_RISK: { label: 'At Risk', color: colors.atRisk },`
- `app/(app)/(tabs)/projects.tsx:87` → `color: colors.atRisk` (the `At Risk` summary value).

- [ ] **Step 3: Replace the gradient literal**

- `app/index.tsx:19` → `colors={[colors.gradientTop, colors.background]}`.

- [ ] **Step 4: Write a StatusBadge test**

```tsx
// src/components/__tests__/StatusBadge.test.tsx
import { render } from '@testing-library/react-native';
import React from 'react';
import StatusBadge from '@/src/components/StatusBadge';

test('renders a text label for each status (not color-only)', () => {
  const { getByText } = render(<StatusBadge status="AT_RISK" />);
  expect(getByText('At Risk')).toBeTruthy();
});
```

- [ ] **Step 5: Verify no stray literals remain**

Run: `grep -rn "F5A623\|0E131A" app src`
Expected: matches only in `src/theme/colors.ts`.

- [ ] **Step 6: Test + typecheck + lint + commit**

```bash
npm test -- StatusBadge && npx tsc --noEmit && npm run lint
git add src/theme/colors.ts src/components/StatusBadge.tsx "app/(app)/(tabs)/projects.tsx" app/index.tsx src/components/__tests__/StatusBadge.test.tsx
git commit -m "refactor(theme): tokenize at-risk and gradient colors (L1, L2)"
```

---

### Task 2: Missing accessibility labels

**Files:**
- Modify: `app/(auth)/login.tsx:148-158`, `app/(app)/(tabs)/projects.tsx:111`

- [ ] **Step 1: Label the password show/hide toggle**

On the eye `TouchableOpacity` in `login.tsx`, add:

```tsx
accessibilityRole="button"
accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
```

- [ ] **Step 2: Label the projects clear-search button**

On the clear-search `TouchableOpacity` in `projects.tsx:111`, add `accessibilityLabel="Clear search"` (matching the issues-list screen).

- [ ] **Step 3: Lint + typecheck + commit**

```bash
npx tsc --noEmit && npm run lint
git add "app/(auth)/login.tsx" "app/(app)/(tabs)/projects.tsx"
git commit -m "a11y: label password toggle and clear-search controls (L3)"
```

---

### Task 3: Respect reduced motion

**Files:**
- Create: `src/hooks/useReducedMotion.ts`
- Modify: `app/_layout.tsx`, `app/(app)/_layout.tsx`, `app/index.tsx`

- [ ] **Step 1: Implement the hook**

```ts
// src/hooks/useReducedMotion.ts
import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** True when the OS "reduce motion" setting is enabled. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => { if (mounted) setReduced(v); });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { mounted = false; sub.remove(); };
  }, []);
  return reduced;
}
```

- [ ] **Step 2: Use it in the stacks**

In `app/_layout.tsx` and `app/(app)/_layout.tsx`, compute `const reduceMotion = useReducedMotion();` and set `animation: reduceMotion ? 'none' : 'fade'` (root) / `'slide_from_right'` (app) in `screenOptions`. Apply the same to the per-screen `animation` options in `(app)/_layout.tsx`.

- [ ] **Step 3: Splash respects it**

In `app/index.tsx`, when `reduceMotion` is true, skip/shorten the gradient emphasis (keep the `ActivityIndicator`; the 1500ms redirect timer is unchanged).

- [ ] **Step 4: Typecheck + lint + export + commit**

```bash
npx tsc --noEmit && npm run lint && npx expo export --platform web
git add src/hooks/useReducedMotion.ts app/_layout.tsx "app/(app)/_layout.tsx" app/index.tsx
git commit -m "a11y: honor reduce-motion for navigation animations (L4)"
```

---

### Task 4: Correct misleading sync copy

**Files:**
- Modify: `app/(app)/(tabs)/report.tsx:117-120`, `app/(app)/issues/new.tsx:594-596`

- [ ] **Step 1: Soften the copy to reflect local-only persistence**

- `report.tsx` info box → "Reports are saved on this device. Server sync and attachments will arrive in a future update."
- `issues/new.tsx` note box → "Assigned teams will be notified once backend integration is available. Reports are currently saved on this device."

- [ ] **Step 2: Lint + typecheck + commit**

```bash
npx tsc --noEmit && npm run lint
git add "app/(app)/(tabs)/report.tsx" "app/(app)/issues/new.tsx"
git commit -m "docs(ui): correct copy to reflect local-only persistence (M6)"
```

---

## Security Considerations

- Copy change removes a misleading implication that safety/defect data left the device — reduces the risk of a user relying on a sync that did not happen.

## Testing Requirements

- `StatusBadge` renders a text label per status (Task 1).
- Manual: with OS reduce-motion on, transitions are immediate; labels are announced by a screen reader.

## Acceptance Criteria

- No `#F5A623`/`#0E131A` literals outside `src/theme/colors.ts`.
- Password toggle and projects clear-search expose accessible labels.
- Navigation animations disable under reduce-motion.
- Sync copy reflects local-only behavior.
- `tsc`, `lint`, `expo export`, `npm test` green.

## Verification Commands

```bash
npx tsc --noEmit
npm run lint
npm test
npx expo export --platform web
grep -rn "F5A623\|0E131A" app src   # only colors.ts
```

## Rollback Considerations

- Purely cosmetic/additive; revert per commit. No data or navigation-structure changes.

## Dependencies

- Test step uses `plans/004` runner. No new packages.

## Estimated Implementation Risk: **Low**
