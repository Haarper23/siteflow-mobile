import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StorageLoadResult } from '@/src/utils/storageCore';
import { STORAGE_VERSION } from '@/src/utils/storageCore';
import {
  ISSUES_STORAGE_KEY,
  loadIssues,
  saveIssues,
} from '@/src/utils/issueStorage';
import {
  DAILY_REPORTS_STORAGE_KEY,
  loadDailyReports,
  saveDailyReports,
} from '@/src/utils/dailyReportStorage';
import type { ConstructionIssue } from '@/src/types/issue';
import type { DailySiteReport } from '@/src/types/dailyReport';
import { makeIssue, makeReport } from '../fixtures';

// Drives the mandated storage cases (empty / valid / legacy migration /
// malformed JSON / malformed root / unsupported version / read failure /
// write failure / successful save) against both persistence modules through a
// single generic suite, so the contract is asserted identically for each.

interface StorageModule<T extends { id: string }> {
  name: string;
  key: string;
  load: () => Promise<StorageLoadResult<T>>;
  save: (items: T[]) => Promise<void>;
  makeValid: (id: string) => T;
}

function runSuite<T extends { id: string }>(mod: StorageModule<T>): void {
  describe(mod.name, () => {
    beforeEach(async () => {
      await AsyncStorage.clear();
      jest.clearAllMocks();
    });

    it('reports "empty" when nothing has ever been stored', async () => {
      await expect(mod.load()).resolves.toEqual({ status: 'empty' });
    });

    it('reads back a valid versioned collection without flagging migration', async () => {
      const item = mod.makeValid('a');
      await mod.save([item]);

      await expect(mod.load()).resolves.toEqual({
        status: 'ok',
        items: [item],
        migrated: false,
      });
    });

    it('migrates a legacy bare-array payload (no envelope)', async () => {
      const item = mod.makeValid('legacy-1');
      await AsyncStorage.setItem(mod.key, JSON.stringify([item]));

      await expect(mod.load()).resolves.toEqual({
        status: 'ok',
        items: [item],
        migrated: true,
      });
    });

    it('keeps a stored empty collection as a valid empty collection', async () => {
      await mod.save([]);
      await expect(mod.load()).resolves.toEqual({
        status: 'ok',
        items: [],
        migrated: false,
      });
    });

    it('drops a malformed element but keeps valid siblings', async () => {
      const good = mod.makeValid('good');
      await AsyncStorage.setItem(
        mod.key,
        JSON.stringify({ version: STORAGE_VERSION, items: [good, { junk: true }] }),
      );

      const result = await mod.load();
      expect(result.status).toBe('ok');
      if (result.status === 'ok') {
        expect(result.items.map((i) => i.id)).toEqual(['good']);
      }
    });

    it('reports "malformed" for unparseable JSON', async () => {
      await AsyncStorage.setItem(mod.key, 'this is not json {');
      await expect(mod.load()).resolves.toEqual({ status: 'malformed' });
    });

    it('reports "malformed" for a present but unrecognisable root shape', async () => {
      await AsyncStorage.setItem(mod.key, JSON.stringify({ unexpected: 'shape' }));
      await expect(mod.load()).resolves.toEqual({ status: 'malformed' });
    });

    it('reports "unsupported" for a newer schema version and never reinterprets it', async () => {
      await AsyncStorage.setItem(
        mod.key,
        JSON.stringify({ version: STORAGE_VERSION + 99, items: [] }),
      );
      await expect(mod.load()).resolves.toEqual({
        status: 'unsupported',
        version: STORAGE_VERSION + 99,
      });
    });

    it('reports "error" (distinct from corrupt) when the underlying read rejects', async () => {
      jest.mocked(AsyncStorage.getItem).mockRejectedValueOnce(new Error('read failed'));
      await expect(mod.load()).resolves.toEqual({ status: 'error' });
    });

    it('persists inside the current versioned envelope on a successful save', async () => {
      const item = mod.makeValid('saved');
      await mod.save([item]);

      const raw = await AsyncStorage.getItem(mod.key);
      expect(raw).not.toBeNull();
      expect(JSON.parse(raw as string)).toEqual({
        version: STORAGE_VERSION,
        items: [item],
      });
    });

    it('surfaces a write failure as a rejection rather than reporting success', async () => {
      jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('disk full'));
      await expect(mod.save([mod.makeValid('x')])).rejects.toThrow('disk full');
    });
  });
}

runSuite<ConstructionIssue>({
  name: 'issueStorage',
  key: ISSUES_STORAGE_KEY,
  load: loadIssues,
  save: saveIssues,
  makeValid: (id) => makeIssue({ id }),
});

runSuite<DailySiteReport>({
  name: 'dailyReportStorage',
  key: DAILY_REPORTS_STORAGE_KEY,
  load: loadDailyReports,
  save: saveDailyReports,
  makeValid: (id) => makeReport({ id }),
});
