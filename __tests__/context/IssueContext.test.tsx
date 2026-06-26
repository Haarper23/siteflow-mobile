import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IssueProvider, useIssues } from '@/src/context/IssueContext';
import { saveIssues } from '@/src/utils/issueStorage';
import { makeIssue, makeIssueForm } from '../fixtures';

// The context value type is not exported from the module; derive it from the
// public hook so the tests need no production change.
type IssueContextValue = ReturnType<typeof useIssues>;

// Drives the IssueProvider through its public hook API. Storage is pre-seeded
// so the provider hydrates from a known state instead of seeding mock data,
// keeping every assertion deterministic.

let latest: IssueContextValue | undefined;

function Capture(): null {
  latest = useIssues();
  return null;
}

function api(): IssueContextValue {
  if (latest === undefined) throw new Error('IssueProvider is not mounted');
  return latest;
}

async function mountReady(): Promise<void> {
  // Wrap the mount in an async act so the provider's asynchronous hydration
  // (load → setState) settles inside act, keeping the test output warning-free.
  await act(async () => {
    render(
      <IssueProvider>
        <Capture />
      </IssueProvider>,
    );
  });
  await waitFor(() => expect(api().isLoading).toBe(false));
}

beforeEach(async () => {
  latest = undefined;
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

describe('IssueProvider hydration', () => {
  it('seeds from mock data on first launch when storage is empty', async () => {
    await mountReady();
    // The empty store triggers a one-time seed; the collection is non-empty and
    // the seed is persisted for subsequent launches.
    expect(api().loadError).toBe(false);
    expect(api().issues.length).toBeGreaterThan(0);
    const raw = await AsyncStorage.getItem('siteflow_ai_issues_v1');
    expect(raw).not.toBeNull();
  });

  it('hydrates from a valid versioned collection without re-seeding', async () => {
    await saveIssues([makeIssue({ id: 'iss-1', referenceNumber: 'DEF-2026-005' })]);
    await mountReady();

    expect(api().loadError).toBe(false);
    expect(api().issues.map((i) => i.id)).toEqual(['iss-1']);
  });

  it('surfaces a safe load-error state when stored data is corrupt', async () => {
    await AsyncStorage.setItem('siteflow_ai_issues_v1', 'not valid json {');
    await mountReady();

    expect(api().loadError).toBe(true);
    // Corrupt data must never be seeded or cleared over.
    expect(api().issues).toEqual([]);
  });

  it('recovers via refreshIssues after the corrupt data is replaced', async () => {
    await AsyncStorage.setItem('siteflow_ai_issues_v1', '<<corrupt>>');
    await mountReady();
    expect(api().loadError).toBe(true);

    await saveIssues([makeIssue({ id: 'recovered' })]);
    await act(async () => {
      await api().refreshIssues();
    });

    expect(api().loadError).toBe(false);
    expect(api().issues.map((i) => i.id)).toEqual(['recovered']);
  });
});

describe('IssueProvider draft submission (H1 regression)', () => {
  it('promotes a draft to a single submitted record with no resurrected draft', async () => {
    // Seed an unrelated submitted issue plus a draft to be submitted.
    await saveIssues([
      makeIssue({ id: 'other', referenceNumber: 'DEF-2026-005', title: 'Unrelated' }),
      makeIssue({
        id: 'draft-1',
        referenceNumber: '',
        status: 'DRAFT',
        isDraft: true,
        createdAt: '2026-06-01T00:00:00.000Z',
        submittedAt: undefined,
        title: 'Draft issue',
      }),
    ]);
    await mountReady();
    expect(api().drafts.map((d) => d.id)).toEqual(['draft-1']);

    let submitted!: Awaited<ReturnType<IssueContextValue['submitIssueFromDraft']>>;
    await act(async () => {
      submitted = await api().submitIssueFromDraft(
        makeIssueForm({ category: 'ELECTRICAL', title: 'Finished issue' }),
        'draft-1',
      );
    });

    // No zombie draft remains.
    expect(api().drafts).toEqual([]);
    // Exactly one record exists for the logical report (the draft's id), and it
    // is the submitted, non-draft version.
    const promoted = api().issues.filter((i) => i.id === 'draft-1');
    expect(promoted).toHaveLength(1);
    expect(promoted[0].isDraft).toBe(false);
    expect(promoted[0].status).toBe('OPEN');
    expect(promoted[0].title).toBe('Finished issue');
    // Draft id and original createdAt are preserved; reference number is
    // generated from the surviving collection (max 005 → 006).
    expect(promoted[0].createdAt).toBe('2026-06-01T00:00:00.000Z');
    expect(promoted[0].referenceNumber).toBe('DEF-2026-006');
    expect(promoted[0].submittedAt).toBeDefined();
    expect(promoted[0].updatedAt).toBeDefined();
    expect(submitted.id).toBe('draft-1');

    // Unrelated record is untouched, and the total collection is exactly two.
    expect(api().issues.find((i) => i.id === 'other')?.title).toBe('Unrelated');
    expect(api().issues).toHaveLength(2);
    expect(api().drafts).toHaveLength(0);
  });

  it('persists the promoted state so a reload shows no draft', async () => {
    await saveIssues([
      makeIssue({ id: 'draft-1', referenceNumber: '', status: 'DRAFT', isDraft: true }),
    ]);
    await mountReady();

    await act(async () => {
      await api().submitIssueFromDraft(makeIssueForm(), 'draft-1');
    });
    await act(async () => {
      await api().refreshIssues();
    });

    expect(api().drafts).toEqual([]);
    expect(api().issues.filter((i) => i.id === 'draft-1')).toHaveLength(1);
    expect(api().issues[0].isDraft).toBe(false);
  });

  it('does not restore stale data when a follow-up mutation runs after submit', async () => {
    // This is the precise H1 scenario: a second mutation that, under the old
    // stale-closure code, re-persisted the pre-submit snapshot (resurrecting
    // the draft). The ref-latest-state persist must keep the draft gone.
    await saveIssues([
      makeIssue({ id: 'draft-1', referenceNumber: '', status: 'DRAFT', isDraft: true }),
    ]);
    await mountReady();

    await act(async () => {
      await api().submitIssueFromDraft(makeIssueForm(), 'draft-1');
    });
    await act(async () => {
      await api().addIssue(makeIssueForm({ title: 'Another issue' }));
    });

    expect(api().drafts).toEqual([]);
    expect(api().issues.filter((i) => i.isDraft)).toHaveLength(0);
    expect(api().issues.filter((i) => i.id === 'draft-1')).toHaveLength(1);
    expect(api().issues).toHaveLength(2);
  });

  it('propagates a save failure from a mutation instead of reporting success', async () => {
    await saveIssues([makeIssue({ id: 'iss-1', referenceNumber: 'DEF-2026-001' })]);
    await mountReady();

    jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('disk full'));
    await expect(
      act(async () => {
        await api().addIssue(makeIssueForm());
      }),
    ).rejects.toThrow('disk full');
  });
});
