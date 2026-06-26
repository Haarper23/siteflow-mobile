import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

// Covers the logout contract from the Profile screen: the Sign Out action
// confirms, then invokes `signOut` and replaces navigation with /login. `signOut`
// is mocked (the collaborator); the screen wiring is what is under test.

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  router: { replace: (...args: unknown[]) => mockReplace(...args) },
}));

const mockSignOut = jest.fn<Promise<void>, []>();
jest.mock('@/src/context/AuthContext', () => ({
  useAuth: () => ({ signOut: mockSignOut }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ProfileScreen = require('../../app/(app)/(tabs)/profile').default as React.ComponentType;

type AlertButton = { text?: string; style?: string; onPress?: () => void };

beforeEach(() => {
  jest.clearAllMocks();
  mockSignOut.mockResolvedValue(undefined);
});

describe('ProfileScreen logout', () => {
  it('confirms, signs out, and returns to /login', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { getByText } = await render(<ProfileScreen />);

    fireEvent.press(getByText('Sign Out'));

    // A confirmation dialog is shown before anything is cleared.
    expect(alertSpy).toHaveBeenCalledTimes(1);
    const buttons = alertSpy.mock.calls[0][2] as AlertButton[] | undefined;
    const confirm = buttons?.find((b) => b.style === 'destructive');
    expect(confirm).toBeDefined();

    // Simulate the user confirming the sign-out.
    confirm?.onPress?.();

    await waitFor(() => expect(mockSignOut).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/login'));

    alertSpy.mockRestore();
  });

  it('does not sign out when the confirmation is cancelled', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { getByText } = await render(<ProfileScreen />);

    fireEvent.press(getByText('Sign Out'));

    const buttons = alertSpy.mock.calls[0][2] as AlertButton[] | undefined;
    const cancel = buttons?.find((b) => b.style === 'cancel');
    cancel?.onPress?.();

    expect(mockSignOut).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();

    alertSpy.mockRestore();
  });
});
