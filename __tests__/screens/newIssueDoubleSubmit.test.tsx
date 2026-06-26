import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, act } from '@testing-library/react-native';
import { makeIssue } from '../fixtures';

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

async function advanceToReview(screen: Awaited<ReturnType<typeof render>>) {
  // Steps: Location → Details → Evidence → Assignment → Review (4 "Continue"s).
  // Each press is wrapped in act so the step transition flushes (under the React
  // Compiler) before the next step is queried.
  for (let i = 0; i < 4; i += 1) {
    await act(async () => {
      fireEvent.press(screen.getByText('Continue'));
    });
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

    const submitBtn = screen.getByText('Submit Report');
    await act(async () => {
      // Two synchronous presses before the first await resolves.
      fireEvent.press(submitBtn);
      fireEvent.press(submitBtn);
    });

    expect(mockSubmit).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledTimes(1);
  });

  it('does not navigate, preserves the form, and releases the guard when submit fails', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockSubmit.mockRejectedValueOnce(new Error('disk full'));

    const screen = await render(<NewIssueScreen />);
    await advanceToReview(screen);

    await act(async () => {
      fireEvent.press(screen.getByText('Submit Report'));
    });

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
    await act(async () => {
      fireEvent.press(screen.getByText('Submit Report'));
    });
    expect(mockSubmit).toHaveBeenCalledTimes(2);
    expect(mockReplace).toHaveBeenCalledTimes(1);

    alertSpy.mockRestore();
  });

  it('saves only one draft when Save as Draft is pressed twice in the same frame', async () => {
    mockSaveDraft.mockResolvedValue(makeIssue({ id: 'draft-1', isDraft: true }));
    const screen = await render(<NewIssueScreen />);
    await advanceToReview(screen);

    const draftBtn = screen.getByText('Save as Draft');
    await act(async () => {
      fireEvent.press(draftBtn);
      fireEvent.press(draftBtn);
    });

    expect(mockSaveDraft).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledTimes(1);
  });
});
