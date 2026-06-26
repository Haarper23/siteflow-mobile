import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

// The login screen is the demo entry point. These tests lock in the security
// contract (no shipped credentials, no fake password flow) and the behavioural
// contract (the single action calls the auth API and navigates on success).
// `useAuth` is mocked to inject a controllable demo sign-in — the collaborator,
// not the screen logic under test.

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  router: { replace: (...args: unknown[]) => mockReplace(...args) },
}));

const mockSignInDemo = jest.fn<Promise<{ ok: true } | { ok: false; message: string }>, []>();
jest.mock('@/src/context/AuthContext', () => ({
  useAuth: () => ({ signInDemo: mockSignInDemo }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const LoginScreen = require('../../app/(auth)/login').default as React.ComponentType;

beforeEach(() => {
  jest.clearAllMocks();
  mockSignInDemo.mockResolvedValue({ ok: true });
});

describe('LoginScreen', () => {
  it('offers an accessible "Continue in Demo Mode" action', async () => {
    const { getByLabelText, getByText } = await render(<LoginScreen />);
    expect(getByLabelText('Continue in demo mode')).toBeTruthy();
    expect(getByText('Continue in Demo Mode')).toBeTruthy();
  });

  it('explains that this is a local demo session, not real authentication', async () => {
    const { getByText } = await render(<LoginScreen />);
    expect(getByText('Local demo mode')).toBeTruthy();
    expect(getByText(/local portfolio demo session/i)).toBeTruthy();
    expect(getByText(/production authentication will\s+be provided by the backend/i)).toBeTruthy();
  });

  it('renders no password field and no reusable credential card', async () => {
    const { queryByText, queryByPlaceholderText, queryByLabelText } = await render(<LoginScreen />);
    expect(queryByText(/password/i)).toBeNull();
    expect(queryByText(/demo account/i)).toBeNull();
    expect(queryByText(/Demo123/)).toBeNull();
    expect(queryByPlaceholderText(/password/i)).toBeNull();
    expect(queryByLabelText(/password/i)).toBeNull();
  });

  it('starts the demo session and navigates home when the action is pressed', async () => {
    const { getByLabelText } = await render(<LoginScreen />);

    await act(async () => {
      fireEvent.press(getByLabelText('Continue in demo mode'));
    });

    await waitFor(() => expect(mockSignInDemo).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/home'));
  });

  it('shows a generic error and does not navigate when sign-in fails', async () => {
    mockSignInDemo.mockResolvedValue({
      ok: false,
      message: 'Could not start the demo session. Please try again.',
    });
    const { getByLabelText, getByText } = await render(<LoginScreen />);

    await act(async () => {
      fireEvent.press(getByLabelText('Continue in demo mode'));
    });

    await waitFor(() =>
      expect(getByText('Could not start the demo session. Please try again.')).toBeTruthy(),
    );
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
