import type { DemoSession } from '@/src/types/session';

// Verifies the documented web fallback: on web there is no SecureStore, so the
// demo session is held in memory only and is never written to any persistent
// store. `Platform.OS` is forced to 'web' via an isolated module mock so the
// web branch of the wrapper runs.

type SessionStorageModule = typeof import('@/src/utils/sessionStorage');

function makeSession(overrides: Partial<DemoSession> = {}): DemoSession {
  return {
    id: 'session-web',
    userId: 'demo-user',
    displayName: 'Demo User',
    mode: 'DEMO',
    createdAt: '2026-06-20T08:00:00.000Z',
    ...overrides,
  };
}

function loadWebModule(): {
  mod: SessionStorageModule;
  secureStore: { setItemAsync: jest.Mock; getItemAsync: jest.Mock; deleteItemAsync: jest.Mock };
} {
  jest.doMock('react-native', () => ({ Platform: { OS: 'web' } }));
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('@/src/utils/sessionStorage') as SessionStorageModule;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const secureStore = require('expo-secure-store') as {
    setItemAsync: jest.Mock;
    getItemAsync: jest.Mock;
    deleteItemAsync: jest.Mock;
  };
  return { mod, secureStore };
}

beforeEach(() => {
  jest.resetModules();
});

describe('sessionStorage (web in-memory fallback)', () => {
  it('starts signed out — a fresh runtime (page reload) has no session', async () => {
    const { mod } = loadWebModule();
    await expect(mod.getStoredSession()).resolves.toBeNull();
  });

  it('keeps the session in memory and never touches the secure store', async () => {
    const { mod, secureStore } = loadWebModule();
    const session = makeSession();

    await mod.saveSession(session);
    await expect(mod.getStoredSession()).resolves.toEqual(session);

    await mod.clearStoredSession();
    await expect(mod.getStoredSession()).resolves.toBeNull();

    expect(secureStore.setItemAsync).not.toHaveBeenCalled();
    expect(secureStore.getItemAsync).not.toHaveBeenCalled();
    expect(secureStore.deleteItemAsync).not.toHaveBeenCalled();
  });
});
