import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { AuthProvider, useAuth } from '@/src/context/AuthContext';
import { saveSession } from '@/src/utils/sessionStorage';
import type { DemoSession } from '@/src/types/session';

// Drives the AuthProvider through its public hook. SecureStore is the in-memory
// mock from jest.setup.js, so the provider + the real session-storage wrapper
// are exercised end to end (only the native leaf is mocked, never the logic
// under test).

type AuthContextValue = ReturnType<typeof useAuth>;

const mockSecureStore = SecureStore as unknown as {
  getItemAsync: jest.Mock;
  setItemAsync: jest.Mock;
  deleteItemAsync: jest.Mock;
  __resetStore: () => void;
};

let latest: AuthContextValue | undefined;

function Capture(): null {
  latest = useAuth();
  return null;
}

function api(): AuthContextValue {
  if (latest === undefined) throw new Error('AuthProvider is not mounted');
  return latest;
}

function renderProvider(): void {
  render(
    <AuthProvider>
      <Capture />
    </AuthProvider>,
  );
}

async function mountReady(): Promise<void> {
  await act(async () => {
    renderProvider();
  });
  await waitFor(() => expect(api().isLoading).toBe(false));
}

function makeSession(overrides: Partial<DemoSession> = {}): DemoSession {
  return {
    id: 'session-1',
    userId: 'demo-user',
    displayName: 'Demo User',
    mode: 'DEMO',
    createdAt: '2026-06-20T08:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  latest = undefined;
  mockSecureStore.__resetStore();
  jest.clearAllMocks();
});

describe('AuthProvider restoration', () => {
  it('begins in a loading state before restoration settles', async () => {
    // Hold the secure read open so restoration cannot settle, then observe the
    // loading state, then release it.
    let resolveRead!: (value: string | null) => void;
    mockSecureStore.getItemAsync.mockReturnValueOnce(
      new Promise<string | null>((resolve) => {
        resolveRead = resolve;
      }),
    );

    await act(async () => {
      renderProvider();
    });
    expect(api().isLoading).toBe(true);
    expect(api().isAuthenticated).toBe(false);

    await act(async () => {
      resolveRead(null);
    });
    await waitFor(() => expect(api().isLoading).toBe(false));
  });

  it('restores a persisted demo session on mount', async () => {
    const stored = makeSession({ id: 'restored', displayName: 'Restored User' });
    await saveSession(stored);

    await mountReady();

    expect(api().isAuthenticated).toBe(true);
    expect(api().session).toEqual(stored);
    expect(api().user).toEqual({ id: 'demo-user', displayName: 'Restored User', email: undefined });
  });

  it('starts signed out when no session is stored', async () => {
    await mountReady();

    expect(api().isAuthenticated).toBe(false);
    expect(api().session).toBeNull();
    expect(api().user).toBeNull();
  });

  it('ends signed out when restoration fails (read error)', async () => {
    mockSecureStore.getItemAsync.mockRejectedValueOnce(new Error('read failed'));

    await mountReady();

    expect(api().isAuthenticated).toBe(false);
    expect(api().session).toBeNull();
  });
});

describe('AuthProvider sign-in', () => {
  it('creates and persists a local demo session on signInDemo', async () => {
    await mountReady();

    let result!: Awaited<ReturnType<AuthContextValue['signInDemo']>>;
    await act(async () => {
      result = await api().signInDemo();
    });

    expect(result).toEqual({ ok: true });
    expect(api().isAuthenticated).toBe(true);
    expect(api().session?.mode).toBe('DEMO');
    expect(api().session?.id).toBeTruthy();
    // The session was actually persisted (survives a re-read).
    const raw = await SecureStore.getItemAsync('siteflow_ai_session_v1');
    expect(raw).not.toBeNull();
  });

  it('never embeds a password in the created demo session', async () => {
    await mountReady();
    await act(async () => {
      await api().signInDemo();
    });

    expect(Object.keys(api().session ?? {})).not.toContain('password');
  });

  it('does not report a successful sign-in when persistence fails', async () => {
    await mountReady();
    mockSecureStore.setItemAsync.mockRejectedValueOnce(new Error('keystore full'));

    let result!: Awaited<ReturnType<AuthContextValue['signInDemo']>>;
    await act(async () => {
      result = await api().signInDemo();
    });

    expect(result.ok).toBe(false);
    expect(api().isAuthenticated).toBe(false);
    expect(api().session).toBeNull();
  });
});

describe('AuthProvider sign-out', () => {
  it('clears the session and persisted record on signOut', async () => {
    await saveSession(makeSession());
    await mountReady();
    expect(api().isAuthenticated).toBe(true);

    await act(async () => {
      await api().signOut();
    });

    expect(api().isAuthenticated).toBe(false);
    expect(api().session).toBeNull();
    const raw = await SecureStore.getItemAsync('siteflow_ai_session_v1');
    expect(raw).toBeNull();
  });

  it('still clears in-memory authentication when secure deletion fails', async () => {
    await saveSession(makeSession());
    await mountReady();
    mockSecureStore.deleteItemAsync.mockRejectedValueOnce(new Error('delete failed'));

    await act(async () => {
      await api().signOut();
    });

    // The contract: a failed secure delete must not leave the user "signed in".
    expect(api().isAuthenticated).toBe(false);
    expect(api().session).toBeNull();
  });
});
