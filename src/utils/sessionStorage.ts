import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { DemoSession, SessionMode } from '@/src/types/session';

/**
 * Typed persistence for the local demo session, deliberately decoupled from the
 * UI so it can later be swapped for real backend token storage without touching
 * any screen.
 *
 * - Native (Android/iOS): the small session *record* is stored in
 *   `expo-secure-store` (encrypted Keychain / Keystore). No password and no
 *   token are ever written — only the non-secret demo-session fields.
 * - Web: `expo-secure-store` is unavailable, and writing a pretend auth value to
 *   `localStorage` would be dishonest, so the session lives **in memory only**.
 *   A browser refresh therefore signs the demo user out. This is intentional and
 *   documented (see `.claude/rules/security.md`).
 *
 * SECURITY: nothing here logs the stored value. The wrapper degrades safely —
 * missing, malformed, and read failures all resolve to `null` so callers treat
 * the user as signed out rather than crashing. Write/delete failures reject so
 * callers never falsely report success.
 */

/** Versioned, project-specific key. Bump the suffix if the shape ever changes. */
export const SESSION_STORAGE_KEY = 'siteflow_ai_session_v1';

const SESSION_MODES: readonly SessionMode[] = ['DEMO'];

const isWeb = Platform.OS === 'web';

// Web-only, non-persistent fallback. Module-scoped so it is shared across
// imports within a single JS runtime but lost on a full page reload.
let inMemorySession: DemoSession | null = null;

function isDemoSession(value: unknown): value is DemoSession {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  const emailOk = record.email === undefined || typeof record.email === 'string';
  return (
    typeof record.id === 'string' &&
    typeof record.userId === 'string' &&
    typeof record.displayName === 'string' &&
    typeof record.createdAt === 'string' &&
    typeof record.mode === 'string' &&
    SESSION_MODES.includes(record.mode as SessionMode) &&
    emailOk
  );
}

function parseSession(raw: string | null): DemoSession | null {
  if (raw === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  return isDemoSession(parsed) ? parsed : null;
}

/** Reads the persisted demo session, or `null` if none / unreadable / invalid. */
export async function getStoredSession(): Promise<DemoSession | null> {
  if (isWeb) return inMemorySession;
  try {
    const raw = await SecureStore.getItemAsync(SESSION_STORAGE_KEY);
    return parseSession(raw);
  } catch {
    // Read failure is treated as "no session" so the user is signed out safely.
    return null;
  }
}

/**
 * Persists the demo session. Rejects on write failure so the caller can avoid
 * reporting a successful sign-in when nothing was actually stored.
 */
export async function saveSession(session: DemoSession): Promise<void> {
  if (isWeb) {
    inMemorySession = session;
    return;
  }
  await SecureStore.setItemAsync(SESSION_STORAGE_KEY, JSON.stringify(session));
}

/**
 * Removes the persisted demo session. Rejects on delete failure so the caller
 * can react (e.g. still clear in-memory auth and surface a generic message).
 */
export async function clearStoredSession(): Promise<void> {
  if (isWeb) {
    inMemorySession = null;
    return;
  }
  await SecureStore.deleteItemAsync(SESSION_STORAGE_KEY);
}
