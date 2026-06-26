import type { ConstructionIssue } from '@/src/types/issue';
import { parseStoredIssues } from '@/src/utils/validateStored';
import {
  clearCollection,
  loadCollection,
  saveCollection,
  type StorageLoadResult,
} from '@/src/utils/storageCore';

export const ISSUES_STORAGE_KEY = 'siteflow_ai_issues_v1';

/**
 * Loads persisted issues, validating every element and recognising both the
 * legacy bare-array format and the current versioned envelope. See
 * {@link StorageLoadResult} for the meaning of each returned state.
 */
export function loadIssues(): Promise<StorageLoadResult<ConstructionIssue>> {
  return loadCollection(ISSUES_STORAGE_KEY, parseStoredIssues);
}

/** Persists the full issue collection. Rejects if the write fails. */
export function saveIssues(issues: ConstructionIssue[]): Promise<void> {
  return saveCollection(ISSUES_STORAGE_KEY, issues);
}

/** Removes all stored issues. Intended for explicit user actions / debugging only. */
export function clearIssues(): Promise<void> {
  return clearCollection(ISSUES_STORAGE_KEY);
}
