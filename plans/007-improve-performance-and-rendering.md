# 007 — Improve Performance and Rendering Implementation Plan

> **For agentic workers:** Use `superpowers:subagent-driven-development` or `superpowers:executing-plans`. Steps use `- [ ]`. Test steps assume the runner from `plans/004`.

**Goal:** Make submit guards race-proof, persist notification read-state and derive the tab badge from it, and reduce avoidable re-renders in list rows with first-load loading states.

**Architecture:** Replace the stale-closure `isSaving` boolean guard with a synchronous `useRef`. Introduce a `NotificationContext` (AsyncStorage-backed) so "mark all read" persists and the tab badge reflects real unread count. Memoize list-row components and surface a loading state during first hydration.

**Tech Stack:** Expo SDK 54, React 19 (+ React Compiler), AsyncStorage, Expo Router `Tabs`.

## Global Constraints

- Forms require double-submission protection. — `.claude/rules/testing.md`
- Support loading/empty/error/offline states. — `.claude/rules/mobile-engineering.md`
- Don't communicate state by color alone (badge must pair with content). — `.claude/rules/mobile-engineering.md`
- No `any`/`@ts-ignore`. — root `CLAUDE.md`
- Branch (`refactor/...`); no commit/push without approval. — `.claude/rules/git-workflow.md`

## Confirmed Findings Addressed

- **M2** — Double-submit guard relies on a stale-closure boolean.
- **M3** — Notifications "mark all read" + tab badge non-persistent/hardcoded.
- Re-render/memoization and first-load loading-state gaps (audit §15).

## Files Affected

- Modify: `app/(app)/issues/new.tsx`, `app/(app)/daily-reports/new.tsx` — ref-based submit guard.
- Create: `src/context/NotificationContext.tsx`, `src/utils/notificationStorage.ts`.
- Modify: `app/(app)/_layout.tsx` — mount `NotificationProvider`.
- Modify: `app/(app)/(tabs)/notifications.tsx` — consume the context.
- Modify: `app/(app)/(tabs)/_layout.tsx:71` — derive the badge.
- Modify: `src/components/IssueCard.tsx`, `DailyReportCard.tsx`, `ProjectCard.tsx` — `React.memo`.
- Modify: `app/(app)/issues/index.tsx`, `daily-reports/index.tsx` — first-load loading state.
- Tests under `src/context/__tests__/`.

## Interfaces

- `notificationStorage.ts` **produces:** `loadReadIds(): Promise<string[]>`, `saveReadIds(ids: string[]): Promise<void>`.
- `NotificationContext.tsx` **produces:** `useNotifications(): { notifications: Notification[]; unreadCount: number; markAllRead(): Promise<void> }`.

---

### Task 1: Ref-based submit guard (M2)

**Files:**
- Modify: `app/(app)/issues/new.tsx`, `app/(app)/daily-reports/new.tsx`

- [ ] **Step 1: Add a submitting ref and guard synchronously**

Near the other refs:

```tsx
const submittingRef = useRef(false);
```

At the very top of both `handleSubmit` and `handleSaveDraft`:

```tsx
if (submittingRef.current) return;
submittingRef.current = true;
setIsSaving(true);
try {
  // ...existing body...
} finally {
  submittingRef.current = false;
  setIsSaving(false);
}
```

Remove the old `if (isSaving) return;` line (the ref now guards). Keep `disabled={isSaving}` for the visual state.

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/issues/new.tsx" "app/(app)/daily-reports/new.tsx"
git commit -m "fix(forms): race-proof submit guard via ref (M2)"
```

---

### Task 2: Persistent notifications + derived badge (M3)

**Files:**
- Create: `src/utils/notificationStorage.ts`, `src/context/NotificationContext.tsx`
- Modify: `app/(app)/_layout.tsx`, `app/(app)/(tabs)/notifications.tsx`, `app/(app)/(tabs)/_layout.tsx`
- Test: `src/context/__tests__/NotificationContext.test.tsx`

- [ ] **Step 1: Storage helper**

```ts
// src/utils/notificationStorage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const READ_IDS_KEY = 'siteflow_ai_notification_read_ids_v1';

export async function loadReadIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(READ_IDS_KEY);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export async function saveReadIds(ids: string[]): Promise<void> {
  try { await AsyncStorage.setItem(READ_IDS_KEY, JSON.stringify(ids)); } catch { /* noop */ }
}
```

- [ ] **Step 2: Context**

```tsx
// src/context/NotificationContext.tsx
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Notification } from '@/src/types/notification';
import { NOTIFICATIONS } from '@/src/data/notifications';
import { loadReadIds, saveReadIds } from '@/src/utils/notificationStorage';

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  markAllRead: () => Promise<void>;
}
const Ctx = createContext<NotificationContextValue | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [readIds, setReadIds] = useState<string[]>([]);

  useEffect(() => { void (async () => setReadIds(await loadReadIds()))(); }, []);

  const notifications = useMemo<Notification[]>(
    () => NOTIFICATIONS.map((n) => ({ ...n, isRead: n.isRead || readIds.includes(n.id) })),
    [readIds],
  );
  const unreadCount = useMemo(() => notifications.filter((n) => !n.isRead).length, [notifications]);

  const markAllRead = useCallback(async () => {
    const all = NOTIFICATIONS.map((n) => n.id);
    setReadIds(all);
    await saveReadIds(all);
  }, []);

  const value = useMemo(() => ({ notifications, unreadCount, markAllRead }), [notifications, unreadCount, markAllRead]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(Ctx);
  if (ctx === undefined) throw new Error('useNotifications must be used within a NotificationProvider');
  return ctx;
}
```

- [ ] **Step 3: Mount provider + consume in screen + derive badge**

- `app/(app)/_layout.tsx`: wrap inside the existing providers with `<NotificationProvider>`.
- `notifications.tsx`: replace `useState(NOTIFICATIONS)` + local `markAllRead` with `useNotifications()`.
- `(tabs)/_layout.tsx:71`: replace `tabBarBadge: 3` with a value derived from `useNotifications().unreadCount` (omit the badge when `0`).

- [ ] **Step 4: Test persistence**

```tsx
// src/context/__tests__/NotificationContext.test.tsx
import { render, waitFor, act } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';
import { NotificationProvider, useNotifications } from '@/src/context/NotificationContext';

jest.mock('@react-native-async-storage/async-storage', () => {
  let store: Record<string, string> = {};
  return { getItem: jest.fn(async (k: string) => store[k] ?? null), setItem: jest.fn(async (k: string, v: string) => { store[k] = v; }) };
});

test('markAllRead drives unreadCount to zero', async () => {
  let api: ReturnType<typeof useNotifications> | null = null;
  function Probe() { api = useNotifications(); return <Text>{api.unreadCount}</Text>; }
  render(<NotificationProvider><Probe /></NotificationProvider>);
  await waitFor(() => expect(api).not.toBeNull());
  await act(async () => { await api!.markAllRead(); });
  await waitFor(() => expect(api!.unreadCount).toBe(0));
});
```

- [ ] **Step 5: Run + typecheck + lint + commit**

```bash
npm test -- NotificationContext && npx tsc --noEmit && npm run lint
git add src/utils/notificationStorage.ts src/context/NotificationContext.tsx "app/(app)/_layout.tsx" "app/(app)/(tabs)/notifications.tsx" "app/(app)/(tabs)/_layout.tsx" src/context/__tests__/NotificationContext.test.tsx
git commit -m "feat(notifications): persist read state and derive tab badge (M3)"
```

---

### Task 3: Memoize list rows + first-load loading state

**Files:**
- Modify: `src/components/IssueCard.tsx`, `DailyReportCard.tsx`, `ProjectCard.tsx`
- Modify: `app/(app)/issues/index.tsx`, `app/(app)/daily-reports/index.tsx`

- [ ] **Step 1: Wrap card components in `React.memo`**

For each card, change `export default function XCard(...)` to a memoized default export:

```tsx
function IssueCard(props: IssueCardProps) { /* unchanged body */ }
export default React.memo(IssueCard);
```

(Repeat for `DailyReportCard`, `ProjectCard`. Props are already value/stable-id based, so memo is safe.)

- [ ] **Step 2: Render a loading state during first hydration**

In `issues/index.tsx`, read `isLoading` from `useIssues()` and, before the list, show a centered `ActivityIndicator` when `isLoading && issues.length === 0`:

```tsx
if (isLoading && allItems.length === 0) {
  return (
    <View style={[styles.screen, { alignItems: 'center', justifyContent: 'center' }]}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}
```

Mirror in `daily-reports/index.tsx` with its `isLoading`.

- [ ] **Step 3: Typecheck + lint + export**

Run: `npx tsc --noEmit && npm run lint && npx expo export --platform web`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/IssueCard.tsx src/components/DailyReportCard.tsx src/components/ProjectCard.tsx "app/(app)/issues/index.tsx" "app/(app)/daily-reports/index.tsx"
git commit -m "perf: memoize list rows; add first-load loading state"
```

---

## Security Considerations

- Notification read-state is non-sensitive UI data — AsyncStorage is appropriate.
- No secrets or PII introduced.

## Testing Requirements

- `NotificationContext`: `markAllRead` drives `unreadCount` to 0 and persists (Task 2).
- Manual: rapid double-tap submit creates exactly one record (M2); mark-all-read survives navigation; badge matches unread count.

## Acceptance Criteria

- Double-tapping submit/save cannot create duplicates.
- Tab "Alerts" badge equals the live unread count (hidden at 0); read-state persists across remounts.
- List rows are memoized; first cold load shows a loading indicator instead of an empty-state flash.
- `tsc`, `lint`, `expo export`, `npm test` green.

## Verification Commands

```bash
npx tsc --noEmit
npm run lint
npm test
npx expo export --platform web
```

## Rollback Considerations

- Each task is independent; revert per commit. The ref guard and memoization are drop-in; the notification context can be reverted to the prior local-state screen without data loss (read-ids key simply becomes unused).

## Dependencies

- Test steps use `plans/004`. No new packages.

## Estimated Implementation Risk: **Low**
