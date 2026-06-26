// Persistence for notification read-state.
//
// Notifications themselves are seeded from a static module constant; only which
// of them the user has marked read is mutable, so this stores just the set of
// read notification ids. Read-state is non-sensitive UI data, so AsyncStorage
// (unencrypted) is appropriate per `security.md`.
//
// Both helpers fail safe: a read that cannot be parsed degrades to "nothing is
// read" rather than throwing, and a write failure is swallowed (the in-memory
// state stays authoritative and re-persists on the next change).

import AsyncStorage from '@react-native-async-storage/async-storage';

const READ_IDS_KEY = 'siteflow_ai_notification_read_ids_v1';

export async function loadReadIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(READ_IDS_KEY);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    // Drop any non-string element rather than trusting the stored shape, so a
    // malformed or tampered payload can never crash a consumer downstream.
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === 'string')
      : [];
  } catch {
    return [];
  }
}

export async function saveReadIds(ids: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(READ_IDS_KEY, JSON.stringify(ids));
  } catch {
    // Non-fatal: the in-memory read-state remains correct and re-persists on
    // the next change.
  }
}
