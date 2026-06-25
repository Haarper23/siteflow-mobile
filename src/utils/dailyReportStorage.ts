import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DailySiteReport } from '@/src/types/dailyReport';

export const DAILY_REPORTS_STORAGE_KEY = 'siteflow_ai_daily_reports_v1';

/**
 * Loads persisted daily reports from AsyncStorage.
 * Returns null when nothing has been stored yet (so the caller can seed),
 * and an empty array when the stored value is present but unreadable.
 */
export async function loadDailyReports(): Promise<DailySiteReport[] | null> {
  try {
    const raw = await AsyncStorage.getItem(DAILY_REPORTS_STORAGE_KEY);
    if (raw === null) return null;

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed as DailySiteReport[];
  } catch {
    // Corrupted JSON or storage failure — fall back to a safe empty list
    // rather than crashing the app on startup.
    return [];
  }
}

/** Persists the full daily report collection. Errors are swallowed to avoid crashes. */
export async function saveDailyReports(reports: DailySiteReport[]): Promise<void> {
  try {
    await AsyncStorage.setItem(DAILY_REPORTS_STORAGE_KEY, JSON.stringify(reports));
  } catch {
    // Persisting failed (e.g. quota). The in-memory state remains correct.
  }
}

/** Removes all stored daily reports. Intended for explicit user actions / debugging only. */
export async function clearDailyReports(): Promise<void> {
  try {
    await AsyncStorage.removeItem(DAILY_REPORTS_STORAGE_KEY);
  } catch {
    // Ignore — nothing useful to do if removal fails.
  }
}
