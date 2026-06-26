import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { DemoSession } from '@/src/types/session';
import {
  clearStoredSession,
  getStoredSession,
  saveSession,
} from '@/src/utils/sessionStorage';

/**
 * Central client session state for SiteFlow AI.
 *
 * This is an honest, clearly-labelled **local demo-session** foundation. There
 * is no backend yet, so:
 *   - there is no real authentication, access token, refresh token, or JWT;
 *   - `signInDemo` does not verify any credential and requires no password;
 *   - the session grants no server-side authority.
 *
 * SECURITY: client-side route protection driven by this context is a
 * user-experience / local-session boundary only. Real authorization (role,
 * company membership, resource ownership) must be enforced by the future Spring
 * Boot backend. When that backend exists, only the session-storage wrapper and
 * `signInDemo`/`restoreSession` need to change — screens consume this stable API.
 */

/** Minimal user projection derived from the active demo session. */
export interface DemoUser {
  id: string;
  displayName: string;
  email?: string;
}

/** Result of a sign-in attempt. A rejected persistence never reports success. */
export type SignInResult = { ok: true } | { ok: false; message: string };

export interface AuthContextValue {
  /** The active local demo session, or `null` when signed out. */
  session: DemoSession | null;
  /** Convenience projection of the signed-in user, or `null`. */
  user: DemoUser | null;
  /** Whether a demo session is currently active. */
  isAuthenticated: boolean;
  /** True while the persisted session is being restored at startup. */
  isLoading: boolean;
  /** Starts a local demo session. No credential is checked. */
  signInDemo: () => Promise<SignInResult>;
  /** Ends the session and clears it from storage. Always resolves. */
  signOut: () => Promise<void>;
  /** Re-reads the persisted session (also run once on mount). */
  restoreSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const DEMO_USER_ID = 'demo-user';
const DEMO_DISPLAY_NAME = 'Demo User';
const SIGN_IN_FAILED_MESSAGE =
  'Could not start the demo session. Please try again.';

function nowIso(): string {
  return new Date().toISOString();
}

function generateSessionId(): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `demo-session-${Date.now().toString(36)}-${random}`;
}

function toUser(session: DemoSession | null): DemoUser | null {
  if (session === null) return null;
  return {
    id: session.userId,
    displayName: session.displayName,
    email: session.email,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<DemoSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const restoreSession = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    // `getStoredSession` already degrades to `null` on any failure, so a failed
    // restore safely lands the user in the signed-out state rather than crashing.
    const restored = await getStoredSession();
    setSession(restored);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  const signInDemo = useCallback(async (): Promise<SignInResult> => {
    const demoSession: DemoSession = {
      id: generateSessionId(),
      userId: DEMO_USER_ID,
      displayName: DEMO_DISPLAY_NAME,
      mode: 'DEMO',
      createdAt: nowIso(),
    };
    try {
      // Persist first; only adopt the session in memory if it was actually
      // stored, so we never falsely report a successful sign-in.
      await saveSession(demoSession);
    } catch {
      return { ok: false, message: SIGN_IN_FAILED_MESSAGE };
    }
    setSession(demoSession);
    return { ok: true };
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    try {
      await clearStoredSession();
    } catch {
      // Contract: a failed secure delete must never leave the user "signed in".
      // We clear in-memory auth regardless and let the route guard redirect.
    }
    setSession(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: toUser(session),
      isAuthenticated: session !== null,
      isLoading,
      signInDemo,
      signOut,
      restoreSession,
    }),
    [session, isLoading, signInDemo, signOut, restoreSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
