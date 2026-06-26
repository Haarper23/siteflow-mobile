import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DailyReportProvider, useDailyReports } from '@/src/context/DailyReportContext';
import { saveDailyReports } from '@/src/utils/dailyReportStorage';
import { makeReport, makeReportForm } from '../fixtures';

// Mirrors the IssueContext suite for the daily-report provider: hydration
// states plus the H1 draft-resurrection regression, driven through the public
// hook with a pre-seeded store.

type DailyReportContextValue = ReturnType<typeof useDailyReports>;

const KEY = 'siteflow_ai_daily_reports_v1';

let latest: DailyReportContextValue | undefined;

function Capture(): null {
  latest = useDailyReports();
  return null;
}

function api(): DailyReportContextValue {
  if (latest === undefined) throw new Error('DailyReportProvider is not mounted');
  return latest;
}

async function mountReady(): Promise<void> {
  await act(async () => {
    render(
      <DailyReportProvider>
        <Capture />
      </DailyReportProvider>,
    );
  });
  await waitFor(() => expect(api().isLoading).toBe(false));
}

beforeEach(async () => {
  latest = undefined;
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

describe('DailyReportProvider hydration', () => {
  it('hydrates from a valid versioned collection without re-seeding', async () => {
    await saveDailyReports([makeReport({ id: 'rep-1', referenceNumber: 'DSR-2026-005' })]);
    await mountReady();

    expect(api().loadError).toBe(false);
    expect(api().reports.map((r) => r.id)).toEqual(['rep-1']);
  });

  it('surfaces a safe load-error state when stored data is corrupt', async () => {
    await AsyncStorage.setItem(KEY, 'not valid json {');
    await mountReady();

    expect(api().loadError).toBe(true);
    expect(api().reports).toEqual([]);
  });
});

describe('DailyReportProvider draft submission (H1 regression)', () => {
  it('promotes a draft to a single submitted record with no resurrected draft', async () => {
    await saveDailyReports([
      makeReport({ id: 'other', referenceNumber: 'DSR-2026-005', generalNotes: 'Unrelated' }),
      makeReport({
        id: 'draft-1',
        referenceNumber: '',
        status: 'DRAFT',
        isDraft: true,
        createdAt: '2026-06-01T00:00:00.000Z',
        submittedAt: undefined,
      }),
    ]);
    await mountReady();
    expect(api().drafts.map((d) => d.id)).toEqual(['draft-1']);

    let submitted!: Awaited<ReturnType<DailyReportContextValue['submitReportFromDraft']>>;
    await act(async () => {
      submitted = await api().submitReportFromDraft(
        makeReportForm({ generalNotes: 'Finished report' }),
        'draft-1',
      );
    });

    expect(api().drafts).toEqual([]);
    const promoted = api().reports.filter((r) => r.id === 'draft-1');
    expect(promoted).toHaveLength(1);
    expect(promoted[0].isDraft).toBe(false);
    expect(promoted[0].status).toBe('SUBMITTED');
    expect(promoted[0].generalNotes).toBe('Finished report');
    expect(promoted[0].createdAt).toBe('2026-06-01T00:00:00.000Z');
    expect(promoted[0].referenceNumber).toBe('DSR-2026-006');
    expect(promoted[0].submittedAt).toBeDefined();
    expect(promoted[0].updatedAt).toBeDefined();
    expect(submitted.id).toBe('draft-1');

    expect(api().reports.find((r) => r.id === 'other')?.generalNotes).toBe('Unrelated');
    expect(api().reports).toHaveLength(2);
    expect(api().drafts).toHaveLength(0);
  });

  it('does not restore stale data when a follow-up mutation runs after submit', async () => {
    await saveDailyReports([
      makeReport({ id: 'draft-1', referenceNumber: '', status: 'DRAFT', isDraft: true }),
    ]);
    await mountReady();

    await act(async () => {
      await api().submitReportFromDraft(makeReportForm(), 'draft-1');
    });
    await act(async () => {
      await api().addReport(makeReportForm({ reportDate: '2026-06-21' }));
    });

    expect(api().drafts).toEqual([]);
    expect(api().reports.filter((r) => r.isDraft)).toHaveLength(0);
    expect(api().reports.filter((r) => r.id === 'draft-1')).toHaveLength(1);
    expect(api().reports).toHaveLength(2);
  });

  it('propagates a save failure from a mutation instead of reporting success', async () => {
    await saveDailyReports([makeReport({ id: 'rep-1', referenceNumber: 'DSR-2026-001' })]);
    await mountReady();

    jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('disk full'));
    await expect(
      act(async () => {
        await api().addReport(makeReportForm());
      }),
    ).rejects.toThrow('disk full');
  });
});
