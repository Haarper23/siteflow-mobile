import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { makeReport } from '../fixtures';

type Screen = Awaited<ReturnType<typeof render>>;
type Instance = ReturnType<Screen['getByText']>;
type Fiber = { memoizedProps: { onPress?: unknown } | null; return: Fiber | null };

// Resolve a Touchable's `onPress` handler from the React fiber tree, the same
// way RNTL's own `fireEvent` does: a composite Touchable does not expose
// `onPress` on the host instance reachable via `.parent`, so we walk the fiber's
// `return` chain instead. A same-frame double tap must invoke that handler twice
// inside a *single* act — two `fireEvent.press` calls would each open their own
// (async) act scope and overlap, which React reports as "overlapping act()".
function onPressOf(node: Instance): () => void {
  let fiber: Fiber | null = (node as unknown as { unstable_fiber: Fiber | null }).unstable_fiber;
  while (fiber) {
    const handler = fiber.memoizedProps?.onPress;
    if (typeof handler === 'function') {
      return handler as () => void;
    }
    fiber = fiber.return;
  }
  throw new Error('No onPress handler found for the element');
}

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

async function advanceToReview(screen: Screen) {
  // 7 steps: Project → Conditions → Workforce → Progress → Resources → Safety →
  // Review, i.e. 6 "Continue" presses. `fireEvent` is async and acts
  // internally, so awaiting each press flushes the step transition before the
  // next step's button is queried.
  for (let i = 0; i < 6; i += 1) {
    await fireEvent.press(screen.getByText('Continue'));
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

    const onSubmit = onPressOf(screen.getByText('Submit Daily Report'));
    await act(async () => {
      // Two presses in the same frame, before the first await resolves. The
      // synchronous ref guard must collapse them into one submit.
      onSubmit();
      onSubmit();
    });

    expect(mockSubmit).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledTimes(1);
  });

  it('does not navigate and releases the guard when submit fails', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockSubmit.mockRejectedValueOnce(new Error('disk full'));

    const screen = await render(<NewDailyReportScreen />);
    await advanceToReview(screen);

    await fireEvent.press(screen.getByText('Submit Daily Report'));
    // The submit rejects asynchronously; wait for the failure to surface.
    await waitFor(() => expect(alertSpy).toHaveBeenCalled());

    expect(mockSubmit).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith(
      'Submit failed',
      'We could not submit this report. Please try again.',
    );

    // Guard released: retry succeeds and navigates exactly once.
    mockSubmit.mockResolvedValueOnce(makeReport({ id: 'created-2' }));
    await fireEvent.press(screen.getByText('Submit Daily Report'));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledTimes(1));
    expect(mockSubmit).toHaveBeenCalledTimes(2);

    alertSpy.mockRestore();
  });
});
