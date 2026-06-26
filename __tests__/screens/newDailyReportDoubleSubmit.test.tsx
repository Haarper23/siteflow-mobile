import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, act } from '@testing-library/react-native';
import { makeReport } from '../fixtures';

// Double-submission protection for the daily-report wizard (M2). Mirrors the
// issue-wizard test: the synchronous ref guard must collapse two same-frame
// presses into a single `submitReportFromDraft` call and a single navigation.
// The heavy step editors are stubbed because validation reads the form state
// seeded from the draft, not their internal UI.

const mockReplace = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  router: {
    replace: (...args: unknown[]) => mockReplace(...args),
    back: (...args: unknown[]) => mockBack(...args),
  },
  useLocalSearchParams: () => ({ draftId: 'draft-1' }),
  useFocusEffect: () => {},
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// Stub the step editors — they pull in pickers/native deps and are not under
// test here. Each renders nothing; the seeded draft supplies the data that
// submit validation checks. Factories are self-contained (no out-of-scope refs)
// so the module hoist stays valid.
jest.mock('@/src/components/WeatherSelector', () => () => null);
jest.mock('@/src/components/WorkforceEditor', () => () => null);
jest.mock('@/src/components/WorkActivityEditor', () => () => null);
jest.mock('@/src/components/MaterialDeliveryEditor', () => () => null);
jest.mock('@/src/components/EquipmentEditor', () => () => null);
jest.mock('@/src/components/PhotoPickerSection', () => () => null);
jest.mock('@/src/components/LinkedIssueSelector', () => () => null);

const mockSubmit = jest.fn();
const mockSaveDraft = jest.fn();
jest.mock('@/src/context/DailyReportContext', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { makeReport: make } = require('../fixtures');
  // A complete draft with the workforce + activity entries that submit
  // validation requires, so every step passes without manual entry.
  const draft = make({
    id: 'draft-1',
    isDraft: true,
    status: 'DRAFT',
    referenceNumber: '',
    workforce: [{ id: 'wf-1', trade: 'Concrete', company: 'Acme', workerCount: 5 }],
    activities: [
      {
        id: 'act-1',
        title: 'Pour slab',
        description: 'Poured the level-2 slab.',
        progressPercentage: 50,
        status: 'IN_PROGRESS',
      },
    ],
  });
  return {
    useDailyReports: () => ({
      submitReportFromDraft: mockSubmit,
      saveDraft: mockSaveDraft,
      getReportById: (id: string) => (id === 'draft-1' ? draft : undefined),
      reports: [],
    }),
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const NewDailyReportScreen = require('../../app/(app)/daily-reports/new')
  .default as React.ComponentType;

async function advanceToReview(screen: Awaited<ReturnType<typeof render>>) {
  // 7 steps: Project → Conditions → Workforce → Progress → Resources → Safety →
  // Review, i.e. 6 "Continue" presses. Each press is wrapped in act so the step
  // transition flushes (under the React Compiler) before the next is queried.
  for (let i = 0; i < 6; i += 1) {
    await act(async () => {
      fireEvent.press(screen.getByText('Continue'));
    });
  }
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('NewDailyReportScreen double-submit protection', () => {
  it('creates only one report when Submit is pressed twice in the same frame', async () => {
    mockSubmit.mockResolvedValue(makeReport({ id: 'created-1' }));
    const screen = await render(<NewDailyReportScreen />);
    await advanceToReview(screen);

    const submitBtn = screen.getByText('Submit Daily Report');
    await act(async () => {
      // Two presses in the same frame, before the first await resolves.
      fireEvent.press(submitBtn);
      fireEvent.press(submitBtn);
    });

    expect(mockSubmit).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledTimes(1);
  });

  it('does not navigate and releases the guard when submit fails', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockSubmit.mockRejectedValueOnce(new Error('disk full'));

    const screen = await render(<NewDailyReportScreen />);
    await advanceToReview(screen);

    await act(async () => {
      fireEvent.press(screen.getByText('Submit Daily Report'));
    });

    expect(mockSubmit).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith(
      'Submit failed',
      'We could not submit this report. Please try again.',
    );

    // Guard released: retry succeeds and navigates exactly once.
    mockSubmit.mockResolvedValueOnce(makeReport({ id: 'created-2' }));
    await act(async () => {
      fireEvent.press(screen.getByText('Submit Daily Report'));
    });
    expect(mockSubmit).toHaveBeenCalledTimes(2);
    expect(mockReplace).toHaveBeenCalledTimes(1);

    alertSpy.mockRestore();
  });
});
