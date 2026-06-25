import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ConstructionIssue } from '@/src/types/issue';

export const ISSUES_STORAGE_KEY = 'siteflow_ai_issues_v1';

/**
 * Loads persisted issues from AsyncStorage.
 * Returns null when nothing has been stored yet (so the caller can seed),
 * and an empty array when the stored value is present but unreadable.
 */
export async function loadIssues(): Promise<ConstructionIssue[] | null> {
  try {
    const raw = await AsyncStorage.getItem(ISSUES_STORAGE_KEY);
    if (raw === null) return null;

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed as ConstructionIssue[];
  } catch {
    // Corrupted JSON or storage failure — fall back to a safe empty list
    // rather than crashing the app on startup.
    return [];
  }
}

/** Persists the full issue collection. Errors are swallowed to avoid crashes. */
export async function saveIssues(issues: ConstructionIssue[]): Promise<void> {
  try {
    await AsyncStorage.setItem(ISSUES_STORAGE_KEY, JSON.stringify(issues));
  } catch {
    // Persisting failed (e.g. quota). The in-memory state remains correct;
    // we simply could not write to disk this time.
  }
}

/** Removes all stored issues. Intended for explicit user actions / debugging only. */
export async function clearIssues(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ISSUES_STORAGE_KEY);
  } catch {
    // Ignore — there is nothing useful to do if removal fails.
  }
}
