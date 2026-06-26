import type { DailySiteReport } from '@/src/types/dailyReport';
import { parseStoredReports } from '@/src/utils/validateStored';
import {
  clearCollection,
  loadCollection,
  saveCollection,
  type StorageLoadResult,
} from '@/src/utils/storageCore';

export const DAILY_REPORTS_STORAGE_KEY = 'siteflow_ai_daily_reports_v1';

/**
 * Loads persisted daily reports, validating every element and recognising both
 * the legacy bare-array format and the current versioned envelope. See
 * {@link StorageLoadResult} for the meaning of each returned state.
 */
export function loadDailyReports(): Promise<StorageLoadResult<DailySiteReport>> {
  return loadCollection(DAILY_REPORTS_STORAGE_KEY, parseStoredReports);
}

/** Persists the full daily report collection. Rejects if the write fails. */
export function saveDailyReports(reports: DailySiteReport[]): Promise<void> {
  return saveCollection(DAILY_REPORTS_STORAGE_KEY, reports);
}

/** Removes all stored daily reports. Intended for explicit user actions / debugging only. */
export function clearDailyReports(): Promise<void> {
  return clearCollection(DAILY_REPORTS_STORAGE_KEY);
}
