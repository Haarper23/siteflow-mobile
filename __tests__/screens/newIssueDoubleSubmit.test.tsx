import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { makeIssue } from '../fixtures';

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

// Double-submission protection for the issue wizard (M2). The fix backs the
// guard with a synchronous ref set before the first await, so two presses in
// the same frame can no longer both pass the `isSaving` state check. These
// tests drive the real screen and assert the persistence collaborator
// (`submitIssueFromDraft`) and navigation each run exactly once.

const mockReplace = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  router: {
    replace: (...args: unknown[]) => mockReplace(...args),
    back: (...args: unknown[]) => mockBack(...args),
  },
  useLocalSearchParams: () => ({ draftId: 'draft-1' }),
  // Back-handler wiring is irrelevant to submission; skip it.
  useFocusEffect: () => {},
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockSubmit = jest.fn();
const mockSaveDraft = jest.fn();
jest.mock('@/src/context/IssueContext', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { makeIssue: make } = require('../fixtures');
  // A complete draft so the wizard prefills and every step validates without
  // any manual field entry.
  const draft = make({
    id: 'draft-1',
    isDraft: true,
    status: 'DRAFT',
    referenceNumber: '',
    dueDate: '2026-07-01T00:00:00.000Z',
  });
  return {
    useIssues: () => ({
      submitIssueFromDraft: mockSubmit,
      saveDraft: mockSaveDraft,
      getIssueById: (id: string) => (id === 'draft-1' ? draft : undefined),
    }),
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const NewIssueScreen = require('../../app/(app)/issues/new').default as React.ComponentType;

async function advanceToReview(screen: Screen) {
  // Steps: Location → Details → Evidence → Assignment → Review (4 "Continue"s).
  // `fireEvent` is async and acts internally, so awaiting each press flushes the
  // step transition before the next step's button is queried.
  for (let i = 0; i < 4; i += 1) {
    await fireEvent.press(screen.getByText('Continue'));
  }
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('NewIssueScreen double-submit protection', () => {
  it('creates only one issue when Submit is pressed twice in the same frame', async () => {
    mockSubmit.mockResolvedValue(makeIssue({ id: 'created-1' }));
    const screen = await render(<NewIssueScreen />);
    await advanceToReview(screen);

    const onSubmit = onPressOf(screen.getByText('Submit Report'));
    await act(async () => {
      // Two synchronous presses in the same frame, before the first await
      // resolves. The synchronous ref guard must collapse them into one submit.
      onSubmit();
      onSubmit();
    });

    expect(mockSubmit).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledTimes(1);
  });

  it('does not navigate, preserves the form, and releases the guard when submit fails', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockSubmit.mockRejectedValueOnce(new Error('disk full'));

    const screen = await render(<NewIssueScreen />);
    await advanceToReview(screen);

    await fireEvent.press(screen.getByText('Submit Report'));
    // The submit rejects asynchronously; wait for the failure to surface.
    await waitFor(() => expect(alertSpy).toHaveBeenCalled());

    // Failure: a safe generic error is shown and no navigation happened.
    expect(mockSubmit).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith(
      'Submit failed',
      'We could not submit this issue. Please try again.',
    );
    // The review still shows the form data — nothing was reset or lost.
    expect(screen.getByText('Cracked beam')).toBeTruthy();

    // Guard released: a retry now succeeds and navigates exactly once.
    mockSubmit.mockResolvedValueOnce(makeIssue({ id: 'created-2' }));
    await fireEvent.press(screen.getByText('Submit Report'));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledTimes(1));
    expect(mockSubmit).toHaveBeenCalledTimes(2);

    alertSpy.mockRestore();
  });

  it('saves only one draft when Save as Draft is pressed twice in the same frame', async () => {
    mockSaveDraft.mockResolvedValue(makeIssue({ id: 'draft-1', isDraft: true }));
    const screen = await render(<NewIssueScreen />);
    await advanceToReview(screen);

    const onSaveDraft = onPressOf(screen.getByText('Save as Draft'));
    await act(async () => {
      onSaveDraft();
      onSaveDraft();
    });

    expect(mockSaveDraft).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledTimes(1);
  });
});
