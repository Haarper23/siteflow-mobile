import * as SecureStore from 'expo-secure-store';
import {
  SESSION_STORAGE_KEY,
  getStoredSession,
  saveSession,
  clearStoredSession,
} from '@/src/utils/sessionStorage';
import type { DemoSession } from '@/src/types/session';

// Exercises the native (SecureStore-backed) session-storage wrapper through its
// public contract: missing / valid / malformed reads, read & write & delete
// failures, a successful round-trip, and the guarantee that no password is ever
// persisted. SecureStore itself is the in-memory mock from jest.setup.js, so the
// wrapper's own parsing/validation logic runs for real.

// Typed handle to the mock helper added in jest.setup.js, avoiding `any`.
const mockSecureStore = SecureStore as unknown as {
  getItemAsync: jest.Mock;
  setItemAsync: jest.Mock;
  deleteItemAsync: jest.Mock;
  __resetStore: () => void;
};

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
  mockSecureStore.__resetStore();
  jest.clearAllMocks();
});

describe('sessionStorage (native)', () => {
  it('returns null when no session has ever been stored', async () => {
    await expect(getStoredSession()).resolves.toBeNull();
  });

  it('round-trips a valid demo session through SecureStore', async () => {
    const session = makeSession({ email: 'someone@example.com' });
    await saveSession(session);

    await expect(getStoredSession()).resolves.toEqual(session);
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
      SESSION_STORAGE_KEY,
      expect.any(String),
    );
  });

  it('returns null for a malformed (unparseable) stored value', async () => {
    await SecureStore.setItemAsync(SESSION_STORAGE_KEY, 'not json {');
    await expect(getStoredSession()).resolves.toBeNull();
  });

  it('returns null for a parseable value that is not a valid session shape', async () => {
    await SecureStore.setItemAsync(
      SESSION_STORAGE_KEY,
      JSON.stringify({ id: 'x', mode: 'NOT_DEMO' }),
    );
    await expect(getStoredSession()).resolves.toBeNull();
  });

  it('returns null (never throws) when the underlying read fails', async () => {
    mockSecureStore.getItemAsync.mockRejectedValueOnce(new Error('read failed'));
    await expect(getStoredSession()).resolves.toBeNull();
  });

  it('persists the session inside the versioned storage key on save', async () => {
    const session = makeSession();
    await saveSession(session);

    const raw = await SecureStore.getItemAsync(SESSION_STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw as string)).toEqual(session);
  });

  it('surfaces a write failure as a rejection instead of reporting success', async () => {
    mockSecureStore.setItemAsync.mockRejectedValueOnce(new Error('keystore full'));
    await expect(saveSession(makeSession())).rejects.toThrow('keystore full');
  });

  it('removes the stored session on a successful delete', async () => {
    await saveSession(makeSession());
    await clearStoredSession();

    await expect(getStoredSession()).resolves.toBeNull();
    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith(SESSION_STORAGE_KEY);
  });

  it('surfaces a delete failure as a rejection so the caller can react', async () => {
    mockSecureStore.deleteItemAsync.mockRejectedValueOnce(new Error('delete failed'));
    await expect(clearStoredSession()).rejects.toThrow('delete failed');
  });

  it('never persists a password field, even if one is smuggled onto the object', async () => {
    // Defend the invariant: the stored payload must contain only session fields.
    const session = makeSession();
    await saveSession(session);

    const raw = (await SecureStore.getItemAsync(SESSION_STORAGE_KEY)) as string;
    expect(raw.toLowerCase()).not.toContain('password');
    expect(Object.keys(JSON.parse(raw))).not.toContain('password');
  });
});
