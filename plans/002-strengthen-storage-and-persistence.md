# 002 — Strengthen Storage and Persistence Implementation Plan

> **For agentic workers:** Use `superpowers:subagent-driven-development` or `superpowers:executing-plans`. Steps use `- [ ]`. Test steps assume the runner from `plans/004`; if it is not yet in place, implement the code and run `tsc`/`lint`/`export` + manual checks, and add the unit tests when 004 lands.

**Goal:** Eliminate the draft-resurrection data bug, validate all data read from AsyncStorage, version the storage schema, and persist picked images to stable on-device paths.

**Architecture:** Add runtime validators that drop invalid elements on load (replacing the unsafe `as` casts), wrap stored payloads in a versioned envelope `{ version, items }`, expose one atomic context action that replaces a draft with its finished record in a single `persist()`, and copy picked image assets into the app document directory under generated filenames before persisting.

**Tech Stack:** Expo SDK 54, React 19, AsyncStorage (existing), `expo-file-system` (Expo-maintained; justified — the platform cannot otherwise give a stable, app-owned image path).

## Global Constraints

- Native deps only via `npx expo install`. — `.claude/rules/mobile-engineering.md`
- No `any`/`@ts-ignore`/`@ts-expect-error`; fix root causes. — root `CLAUDE.md`
- Storage utilities require success/empty/malformed/failure tests. — `.claude/rules/testing.md`
- Preserve working functionality; small focused changes. — root `CLAUDE.md`
- Branch (`fix/...` or `refactor/...`); no commit/push without approval. — `.claude/rules/git-workflow.md`

## Confirmed Findings Addressed

- **H1** — Draft "resurrection" on submit (stale-closure race).
- **H3** — Unvalidated deserialization (`as ConstructionIssue[]` / `as DailySiteReport[]`).
- **M1** — Picked image URIs persisted directly; can become invalid.
- **L7** — Reference/id generation stale-state race (mitigated via functional updates).
- Adds the missing storage **schema version**/migration path (audit §10).

## Files Affected

- Create: `src/utils/validateStored.ts` — element validators/guards for issues & reports.
- Modify: `src/utils/issueStorage.ts` — validated load, versioned envelope.
- Modify: `src/utils/dailyReportStorage.ts` — validated load, versioned envelope.
- Modify: `src/context/IssueContext.tsx` — atomic `submitFromDraft`; functional-update persistence.
- Modify: `src/context/DailyReportContext.tsx` — atomic `submitFromDraft`; functional-update persistence.
- Modify: `app/(app)/issues/new.tsx` — call the atomic action on submit.
- Modify: `app/(app)/daily-reports/new.tsx` — call the atomic action on submit.
- Create: `src/utils/persistImages.ts` — copy assets to document dir.
- Modify: `src/components/PhotoPickerSection.tsx` — persist on selection.
- Tests under `src/utils/__tests__/` and `src/context/__tests__/`.

## Interfaces

- `validateStored.ts` **produces:** `parseStoredIssues(raw: unknown): ConstructionIssue[]`, `parseStoredReports(raw: unknown): DailySiteReport[]` (each returns only valid elements).
- `issueStorage.ts` **produces (unchanged signatures):** `loadIssues(): Promise<ConstructionIssue[] | null>`, `saveIssues(issues): Promise<void>`, plus internal `STORAGE_VERSION`.
- `IssueContext` **produces:** `submitIssueFromDraft(form: IssueFormData, draftId?: string): Promise<ConstructionIssue>` (atomic delete-draft + add).
- `DailyReportContext` **produces:** `submitReportFromDraft(form: DailyReportFormData, draftId?: string): Promise<DailySiteReport>`.
- `persistImages.ts` **produces:** `persistPickedImage(uri: string): Promise<string>` (returns a stable `file://` path in the document dir; falls back to the original uri on failure).

---

### Task 1: Runtime validators for stored collections

**Files:**
- Create: `src/utils/validateStored.ts`
- Test: `src/utils/__tests__/validateStored.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/utils/__tests__/validateStored.test.ts
import { parseStoredIssues, parseStoredReports } from '@/src/utils/validateStored';

test('parseStoredIssues keeps valid, drops invalid elements', () => {
  const input = [
    { id: 'a', referenceNumber: 'DEF-2026-001', projectId: 'p', blockId: 'b', blockName: 'B',
      floor: '1', area: 'x', category: 'OTHER', title: 't', description: 'd', severity: 'LOW',
      status: 'OPEN', assignedTeam: 'T', dueDate: null, photos: [], createdBy: 'u',
      createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', isDraft: false },
    { id: 'bad' }, // missing required fields
    42,            // not an object
  ];
  const out = parseStoredIssues(input);
  expect(out).toHaveLength(1);
  expect(out[0].id).toBe('a');
});

test('parseStoredIssues returns [] for non-array', () => {
  expect(parseStoredIssues({ not: 'array' })).toEqual([]);
});

test('parseStoredReports drops malformed elements', () => {
  expect(parseStoredReports([{ id: 'x' }, null])).toEqual([]);
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npm test -- validateStored`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement validators**

```ts
// src/utils/validateStored.ts
import type { ConstructionIssue, IssueCategory, IssueSeverity, IssueStatus } from '@/src/types/issue';
import type { DailySiteReport, DailyReportStatus } from '@/src/types/dailyReport';

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}
function str(v: unknown): v is string { return typeof v === 'string'; }
function bool(v: unknown): v is boolean { return typeof v === 'boolean'; }
function arr(v: unknown): v is unknown[] { return Array.isArray(v); }

const ISSUE_CATEGORIES: IssueCategory[] = ['STRUCTURAL','ELECTRICAL','PLUMBING','FINISHING','SAFETY','MATERIAL','OTHER'];
const ISSUE_SEVERITIES: IssueSeverity[] = ['LOW','MEDIUM','HIGH','CRITICAL'];
const ISSUE_STATUSES: IssueStatus[] = ['DRAFT','OPEN','IN_PROGRESS','WAITING_APPROVAL','RESOLVED','CLOSED'];

function isValidIssue(v: unknown): v is ConstructionIssue {
  if (!isObj(v)) return false;
  return (
    str(v.id) && str(v.referenceNumber) && str(v.projectId) && str(v.blockId) && str(v.blockName) &&
    str(v.floor) && str(v.area) &&
    str(v.category) && (ISSUE_CATEGORIES as string[]).includes(v.category) &&
    str(v.title) && str(v.description) &&
    str(v.severity) && (ISSUE_SEVERITIES as string[]).includes(v.severity) &&
    str(v.status) && (ISSUE_STATUSES as string[]).includes(v.status) &&
    str(v.assignedTeam) && (v.dueDate === null || str(v.dueDate)) &&
    arr(v.photos) && str(v.createdBy) && str(v.createdAt) && str(v.updatedAt) && bool(v.isDraft)
  );
}

const REPORT_STATUSES: DailyReportStatus[] = ['DRAFT','SUBMITTED','APPROVED','REJECTED'];

function isValidReport(v: unknown): v is DailySiteReport {
  if (!isObj(v)) return false;
  return (
    str(v.id) && str(v.referenceNumber) && str(v.projectId) && str(v.reportDate) &&
    str(v.status) && (REPORT_STATUSES as string[]).includes(v.status) &&
    arr(v.workforce) && arr(v.activities) && arr(v.materialDeliveries) && arr(v.equipment) &&
    arr(v.photos) && arr(v.linkedIssueIds) &&
    bool(v.safetyBriefingCompleted) && bool(v.accidentOccurred) && bool(v.delayOccurred) &&
    str(v.createdBy) && str(v.createdAt) && str(v.updatedAt) && bool(v.isDraft)
  );
}

/** Returns only the valid issue elements from arbitrary stored input. */
export function parseStoredIssues(raw: unknown): ConstructionIssue[] {
  if (!arr(raw)) return [];
  return raw.filter(isValidIssue);
}

/** Returns only the valid daily-report elements from arbitrary stored input. */
export function parseStoredReports(raw: unknown): DailySiteReport[] {
  if (!arr(raw)) return [];
  return raw.filter(isValidReport);
}
```

- [ ] **Step 4: Run tests to PASS**

Run: `npm test -- validateStored`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/validateStored.ts src/utils/__tests__/validateStored.test.ts
git commit -m "feat(storage): add runtime validators for stored collections"
```

---

### Task 2: Versioned, validated storage modules

**Files:**
- Modify: `src/utils/issueStorage.ts`
- Modify: `src/utils/dailyReportStorage.ts`
- Test: `src/utils/__tests__/issueStorage.test.ts`, `src/utils/__tests__/dailyReportStorage.test.ts`

- [ ] **Step 1: Write the five-case storage tests (issues)**

```ts
// src/utils/__tests__/issueStorage.test.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadIssues, saveIssues, ISSUES_STORAGE_KEY } from '@/src/utils/issueStorage';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn(),
}));

const mock = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
afterEach(() => jest.clearAllMocks());

test('returns null when nothing stored', async () => {
  mock.getItem.mockResolvedValue(null);
  expect(await loadIssues()).toBeNull();
});

test('returns [] for non-array / corrupt JSON', async () => {
  mock.getItem.mockResolvedValue('{ not json');
  expect(await loadIssues()).toEqual([]);
});

test('drops malformed elements but keeps valid ones', async () => {
  mock.getItem.mockResolvedValue(JSON.stringify({ version: 1, items: [{ id: 'bad' }] }));
  expect(await loadIssues()).toEqual([]);
});

test('round-trips a saved collection', async () => {
  const captured: Record<string, string> = {};
  mock.setItem.mockImplementation(async (k, v) => { captured[k] = v; });
  mock.getItem.mockImplementation(async (k) => captured[k] ?? null);
  // minimal valid issue
  const issue = { id: 'a', referenceNumber: 'DEF-2026-001', projectId: 'p', blockId: 'b',
    blockName: 'B', floor: '1', area: 'x', category: 'OTHER', title: 't', description: 'd',
    severity: 'LOW', status: 'OPEN', assignedTeam: 'T', dueDate: null, photos: [], createdBy: 'u',
    createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', isDraft: false };
  await saveIssues([issue as never]);
  const loaded = await loadIssues();
  expect(loaded).toHaveLength(1);
});

test('returns [] when read throws', async () => {
  mock.getItem.mockRejectedValue(new Error('read fail'));
  expect(await loadIssues()).toEqual([]);
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npm test -- issueStorage`
Expected: FAIL (envelope/validation not yet implemented).

- [ ] **Step 3: Rewrite `issueStorage.ts` with envelope + validation**

```ts
// src/utils/issueStorage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ConstructionIssue } from '@/src/types/issue';
import { parseStoredIssues } from '@/src/utils/validateStored';

export const ISSUES_STORAGE_KEY = 'siteflow_ai_issues_v1';
const STORAGE_VERSION = 1;

interface Envelope { version: number; items: unknown }

export async function loadIssues(): Promise<ConstructionIssue[] | null> {
  try {
    const raw = await AsyncStorage.getItem(ISSUES_STORAGE_KEY);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    // Back-compat: accept both a bare array (v0) and the versioned envelope.
    const items = Array.isArray(parsed) ? parsed : (parsed as Envelope)?.items;
    return parseStoredIssues(items);
  } catch {
    return [];
  }
}

export async function saveIssues(issues: ConstructionIssue[]): Promise<void> {
  try {
    const envelope: Envelope = { version: STORAGE_VERSION, items: issues };
    await AsyncStorage.setItem(ISSUES_STORAGE_KEY, JSON.stringify(envelope));
  } catch {
    // In-memory state remains correct.
  }
}

export async function clearIssues(): Promise<void> {
  try { await AsyncStorage.removeItem(ISSUES_STORAGE_KEY); } catch { /* noop */ }
}
```

- [ ] **Step 4: Apply the identical pattern to `dailyReportStorage.ts`**

Mirror Step 3 using `DAILY_REPORTS_STORAGE_KEY`, `parseStoredReports`, and `DailySiteReport`. Write the matching five-case test file `dailyReportStorage.test.ts`.

- [ ] **Step 5: Run all storage tests to PASS**

Run: `npm test -- Storage`
Expected: PASS.

- [ ] **Step 6: Typecheck + commit**

```bash
npx tsc --noEmit
git add src/utils/issueStorage.ts src/utils/dailyReportStorage.ts src/utils/__tests__/issueStorage.test.ts src/utils/__tests__/dailyReportStorage.test.ts
git commit -m "feat(storage): versioned envelope + validated load for both collections"
```

---

### Task 3: Atomic submit-from-draft (fixes H1)

**Files:**
- Modify: `src/context/IssueContext.tsx`
- Modify: `src/context/DailyReportContext.tsx`
- Test: `src/context/__tests__/IssueContext.test.tsx`

- [ ] **Step 1: Write a failing context test for the resurrection bug**

```tsx
// src/context/__tests__/IssueContext.test.tsx
import { render, waitFor, act } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';
import { IssueProvider, useIssues } from '@/src/context/IssueContext';

jest.mock('@react-native-async-storage/async-storage', () => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn(async (k: string) => store[k] ?? null),
    setItem: jest.fn(async (k: string, v: string) => { store[k] = v; }),
    removeItem: jest.fn(async (k: string) => { delete store[k]; }),
  };
});

test('submitting from a draft leaves exactly one non-draft record', async () => {
  let api: ReturnType<typeof useIssues> | null = null;
  function Probe() { api = useIssues(); return <Text>{api.drafts.length}/{api.issues.length}</Text>; }
  render(<IssueProvider><Probe /></IssueProvider>);
  await waitFor(() => expect(api!.isLoading).toBe(false));

  const draft = await act(async () =>
    api!.saveDraft({ projectId: 'nova-residence', blockId: 'block-a', blockName: 'Block A',
      floor: '1', area: 'x', category: 'OTHER', title: 'draft', description: 'desc enough chars',
      severity: 'LOW', assignedTeam: 'Safety Team', dueDate: null, photos: [] }),
  );

  await act(async () =>
    api!.submitIssueFromDraft({ projectId: 'nova-residence', blockId: 'block-a', blockName: 'Block A',
      floor: '1', area: 'x', category: 'OTHER', title: 'final', description: 'desc enough chars',
      severity: 'LOW', assignedTeam: 'Safety Team', dueDate: null, photos: [] }, draft.id),
  );

  await waitFor(() => {
    expect(api!.drafts.find((d) => d.id === draft.id)).toBeUndefined();
    expect(api!.issues.filter((i) => i.title === 'final')).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npm test -- IssueContext`
Expected: FAIL (`submitIssueFromDraft` undefined).

- [ ] **Step 3: Make persistence use the functional updater and add the atomic action**

In `IssueContext.tsx`, change `persist` to compute from the latest state, and add the action:

```tsx
// Build the next collection from the latest state, then persist it.
const persist = useCallback(async (build: (prev: ConstructionIssue[]) => ConstructionIssue[]): Promise<ConstructionIssue[]> => {
  let next: ConstructionIssue[] = [];
  setAllIssues((prev) => { next = build(prev); return next; });
  await saveIssues(next);
  return next;
}, []);

const submitIssueFromDraft = useCallback(
  async (form: IssueFormData, draftId?: string): Promise<ConstructionIssue> => {
    const timestamp = nowIso();
    let created!: ConstructionIssue;
    await persist((prev) => {
      const withoutDraft = draftId ? prev.filter((i) => !(i.id === draftId && i.isDraft)) : prev;
      created = {
        id: generateId('issue'),
        referenceNumber: generateReferenceNumber(form.category, withoutDraft),
        projectId: form.projectId, blockId: form.blockId, blockName: form.blockName,
        floor: form.floor, area: form.area, category: form.category,
        title: form.title.trim(), description: form.description.trim(), severity: form.severity,
        status: 'OPEN', assignedTeam: form.assignedTeam, dueDate: form.dueDate, photos: form.photos,
        createdBy: CREATED_BY, createdAt: timestamp, updatedAt: timestamp, submittedAt: timestamp, isDraft: false,
      };
      return [created, ...withoutDraft];
    });
    return created;
  },
  [persist],
);
```

Update the existing `addIssue`/`saveDraft`/`updateIssue`/`deleteDraft`/`markIssueStatus` to use the new `persist(build)` form (each passes a `(prev) => ...` builder instead of a prebuilt array), and add `submitIssueFromDraft` to the context value + its `useMemo` deps.

- [ ] **Step 4: Mirror in `DailyReportContext.tsx`**

Add `submitReportFromDraft(form, draftId?)` using the same functional-updater pattern and `buildReport(...)`.

- [ ] **Step 5: Run tests to PASS**

Run: `npm test -- Context`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/context/IssueContext.tsx src/context/DailyReportContext.tsx src/context/__tests__/IssueContext.test.tsx
git commit -m "fix(storage): atomic submit-from-draft; functional-update persistence (H1)"
```

---

### Task 4: Use the atomic action in the forms

**Files:**
- Modify: `app/(app)/issues/new.tsx:299-347`
- Modify: `app/(app)/daily-reports/new.tsx:365-407`

- [ ] **Step 1: Replace the delete-then-add sequence (issues)**

In `handleSubmit`, replace:

```tsx
if (draftId) {
  const draft = getIssueById(draftId);
  if (draft?.isDraft) { await deleteDraft(draftId); }
}
const created = await addIssue(payload);
```

with:

```tsx
const created = await submitIssueFromDraft(payload, draftId);
```

Pull `submitIssueFromDraft` from `useIssues()`; drop now-unused `deleteDraft`/`getIssueById`/`addIssue` from the destructure if no longer referenced.

- [ ] **Step 2: Mirror in the daily-report form** using `submitReportFromDraft(form, draftId)`.

- [ ] **Step 3: Typecheck + lint + export**

Run: `npx tsc --noEmit && npm run lint && npx expo export --platform web`
Expected: PASS.

- [ ] **Step 4: Manual repro**

Create a draft → reopen → submit → confirm the draft is gone and exactly one issue/report exists.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/issues/new.tsx" "app/(app)/daily-reports/new.tsx"
git commit -m "fix(forms): submit drafts atomically (no resurrected drafts)"
```

---

### Task 5: Persist picked images to a stable path

**Files:**
- Create: `src/utils/persistImages.ts`
- Modify: `src/components/PhotoPickerSection.tsx:29-56`
- Test: `src/utils/__tests__/persistImages.test.ts`

- [ ] **Step 1: Install file system**

Run: `npx expo install expo-file-system`
Expected: SDK-aligned version added; `expo-doctor` green.

- [ ] **Step 2: Implement the copy helper**

```ts
// src/utils/persistImages.ts
import * as FileSystem from 'expo-file-system';

const PHOTO_DIR = `${FileSystem.documentDirectory}siteflow_photos/`;

function generateName(): string {
  return `photo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.jpg`;
}

/** Copies a picked asset into the app document dir; returns a stable file:// path.
 *  Falls back to the original uri if copying is unavailable (e.g. web). */
export async function persistPickedImage(uri: string): Promise<string> {
  try {
    await FileSystem.makeDirectoryAsync(PHOTO_DIR, { intermediates: true });
    const dest = `${PHOTO_DIR}${generateName()}`;
    await FileSystem.copyAsync({ from: uri, to: dest });
    return dest;
  } catch {
    return uri;
  }
}
```

- [ ] **Step 3: Persist on selection in `PhotoPickerSection`**

Make `addAssets` async and copy each asset before building the `IssuePhoto`:

```tsx
const addAssets = async (assets: ImagePicker.ImagePickerAsset[]) => {
  const slice = assets.slice(0, remaining);
  const next: IssuePhoto[] = [];
  for (const asset of slice) {
    const storedUri = await persistPickedImage(asset.uri);
    next.push({ ...assetToPhoto(asset), uri: storedUri });
  }
  if (next.length > 0) onChange([...photos, ...next]);
};
```

Update the two call sites (`handleTakePhoto`, `handlePickLibrary`) to `await addAssets(result.assets)`. Add a broken-image fallback to the thumbnail `Image` via `onError` (show a placeholder icon) so invalid legacy URIs degrade gracefully.

- [ ] **Step 4: Test the helper (mock expo-file-system)**

```ts
// src/utils/__tests__/persistImages.test.ts
jest.mock('expo-file-system', () => ({
  documentDirectory: 'file:///doc/',
  makeDirectoryAsync: jest.fn(async () => {}),
  copyAsync: jest.fn(async () => {}),
}));
import { persistPickedImage } from '@/src/utils/persistImages';

test('returns a path under the document dir', async () => {
  const out = await persistPickedImage('file:///cache/x.jpg');
  expect(out.startsWith('file:///doc/siteflow_photos/')).toBe(true);
});
```

- [ ] **Step 5: Run + typecheck + lint**

Run: `npm test -- persistImages && npx tsc --noEmit && npm run lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/utils/persistImages.ts src/components/PhotoPickerSection.tsx src/utils/__tests__/persistImages.test.ts package.json package-lock.json
git commit -m "feat(photos): persist picked images to app document dir (M1)"
```

---

## Security Considerations

- Validators harden the storage trust boundary (defense against tampered/corrupt local data).
- Image files live in the app sandbox under generated names (aligns with `security.md` "rename uploaded files using generated IDs").
- No secrets touched; AsyncStorage continues to hold non-sensitive data only.

## Testing Requirements

- `validateStored`: valid-kept/invalid-dropped/non-array (Task 1).
- Storage modules: the five mandated cases each — success, empty(`null`), corrupt(non-array), malformed-elements, read-throws (Task 2).
- Context: draft→submit leaves exactly one non-draft record (Task 3, the H1 regression test).
- `persistImages`: returns a document-dir path; falls back on failure (Task 5).

## Acceptance Criteria

- Submitting a draft removes it and creates exactly one finished record (verified by test + manual).
- Corrupt/malformed stored data never crashes load; invalid elements are dropped.
- Stored payloads carry `{ version, items }`; legacy bare-array data still loads.
- Picked images resolve after relaunch; broken legacy URIs show a fallback, not a crash.
- `tsc`, `lint`, `expo export`, `expo-doctor`, `npm test` green.

## Verification Commands

```bash
npx expo install expo-file-system   # Task 5 only
npx tsc --noEmit
npm run lint
npm test
npx expo-doctor@latest
npx expo export --platform web
```

## Rollback Considerations

- Storage envelope is back-compatible (load still accepts bare arrays), so reverting `save*` does not strand data.
- Revert commits per task; the atomic-action change is isolated to the contexts + two form call sites.
- `expo-file-system` can be uninstalled and `persistPickedImage` reverted to pass-through.

## Dependencies

- Adds `expo-file-system`.
- Tests require `plans/004` runner. If 004 is not yet done: implement code, run `tsc`/`lint`/`export` + manual checks, and add tests when the runner exists.

## Estimated Implementation Risk: **Medium**
(Core data paths change, but edits are localized and covered by new regression tests; storage stays backward-compatible.)
