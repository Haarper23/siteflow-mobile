import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Shared, versioned storage primitives for the local-first collections
 * (issues and daily reports). Both modules wrap their payload in a versioned
 * envelope and validate every element read back from disk.
 *
 * Security: nothing here logs stored values. Report/issue bodies may contain
 * site-sensitive details, so payloads are never printed (see
 * `.claude/rules/security.md`).
 */

/** Current on-disk schema version. Bump this and add a migration when the
 *  persisted shape changes. */
export const STORAGE_VERSION = 1;

/** Versioned wrapper persisted to AsyncStorage. */
export interface StorageEnvelope<T> {
  version: number;
  items: T[];
}

/**
 * The result of attempting to load a collection. Callers must distinguish
 * these states so they can seed only when the store is genuinely empty and
 * surface a recoverable error (rather than seeding/clearing) on corruption.
 *
 * - `empty`       — nothing has ever been stored (first launch → seed).
 * - `ok`          — a valid payload was read. `items` may be empty. `migrated`
 *                   is true when a legacy/older payload was upgraded and should
 *                   be re-persisted in the current envelope.
 * - `malformed`   — the stored value was present but its root shape is corrupt
 *                   (bad JSON or neither a legacy array nor a known envelope).
 * - `unsupported` — the envelope declares a newer schema version than this
 *                   build understands; we must not reinterpret it.
 * - `error`       — the underlying AsyncStorage read failed.
 */
export type StorageLoadResult<T> =
  | { status: 'empty' }
  | { status: 'ok'; items: T[]; migrated: boolean }
  | { status: 'malformed' }
  | { status: 'unsupported'; version: number }
  | { status: 'error' };

function isEnvelope(value: unknown): value is { version: number; items: unknown[] } {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.version === 'number' && Array.isArray(record.items);
}

/**
 * Loads and validates a collection from AsyncStorage.
 *
 * `validate` receives the raw, untrusted array and must return only the valid
 * elements (dropping individual malformed entries so one bad record does not
 * discard the rest).
 */
export async function loadCollection<T>(
  key: string,
  validate: (raw: unknown) => T[],
): Promise<StorageLoadResult<T>> {
  let raw: string | null;
  try {
    raw = await AsyncStorage.getItem(key);
  } catch {
    // Underlying read failure — distinct from corrupt data. Never seed/clear.
    return { status: 'error' };
  }

  if (raw === null) return { status: 'empty' };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { status: 'malformed' };
  }

  // Legacy (v0) format: a bare array. Validate and flag for migration so the
  // caller re-persists it inside the versioned envelope.
  if (Array.isArray(parsed)) {
    return { status: 'ok', items: validate(parsed), migrated: true };
  }

  // Versioned envelope.
  if (isEnvelope(parsed)) {
    if (parsed.version > STORAGE_VERSION) {
      // A newer build wrote this. Fail safe — do not reinterpret or clear it.
      return { status: 'unsupported', version: parsed.version };
    }
    // Older-but-known versions would run their migration transform here; until
    // a second version exists, a sub-current version is simply re-persisted.
    const migrated = parsed.version < STORAGE_VERSION;
    return { status: 'ok', items: validate(parsed.items), migrated };
  }

  // Present but unrecognisable root shape.
  return { status: 'malformed' };
}

/**
 * Persists a collection inside the current versioned envelope.
 *
 * Write failures are propagated (the promise rejects) so callers can surface a
 * "save failed" state instead of falsely reporting success.
 */
export async function saveCollection<T>(key: string, items: T[]): Promise<void> {
  const envelope: StorageEnvelope<T> = { version: STORAGE_VERSION, items };
  await AsyncStorage.setItem(key, JSON.stringify(envelope));
}

/** Removes a stored collection. Intended for explicit user actions / debugging. */
export async function clearCollection(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    // Nothing useful to do if removal fails.
  }
}
