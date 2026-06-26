import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  DailyReportFormData,
  DailyReportStatus,
  DailySiteReport,
} from '@/src/types/dailyReport';
import { totalWorkers } from '@/src/types/dailyReport';
import { MOCK_DAILY_REPORTS } from '@/src/data/dailyReports';
import { loadDailyReports, saveDailyReports } from '@/src/utils/dailyReportStorage';
import { isDateToday } from '@/src/utils/date';

const CREATED_BY = 'Berke Deveci';

function nowIso(): string {
  return new Date().toISOString();
}

function generateId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}-${random}`;
}

/** Builds the next readable reference number, e.g. DSR-2026-006. */
function generateReferenceNumber(existing: DailySiteReport[]): string {
  const year = new Date().getFullYear();
  let maxSequence = 0;
  for (const report of existing) {
    const match = /^DSR-\d{4}-(\d+)$/.exec(report.referenceNumber);
    if (match) {
      const seq = parseInt(match[1], 10);
      if (!Number.isNaN(seq) && seq > maxSequence) maxSequence = seq;
    }
  }
  return `DSR-${year}-${(maxSequence + 1).toString().padStart(3, '0')}`;
}

function parseOptionalNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (trimmed === '') return undefined;
  const num = Number(trimmed);
  return Number.isFinite(num) ? num : undefined;
}

function parseCount(value: string): number {
  const num = parseInt(value.trim(), 10);
  return Number.isFinite(num) && num > 0 ? num : 0;
}

interface DailyReportContextValue {
  reports: DailySiteReport[];
  drafts: DailySiteReport[];
  isLoading: boolean;
  loadError: boolean;
  addReport: (form: DailyReportFormData) => Promise<DailySiteReport>;
  /**
   * Submits a finished daily report. When `draftId` refers to an existing
   * draft, that draft is removed and replaced by the submitted record in a
   * single atomic update + persist — preventing the draft-resurrection race.
   * The draft's id and original `createdAt` are preserved.
   */
  submitReportFromDraft: (
    form: DailyReportFormData,
    draftId?: string,
  ) => Promise<DailySiteReport>;
  saveDraft: (form: DailyReportFormData, draftId?: string) => Promise<DailySiteReport>;
  updateReport: (id: string, updates: Partial<DailySiteReport>) => Promise<void>;
  deleteDraft: (id: string) => Promise<void>;
  getReportById: (id: string) => DailySiteReport | undefined;
  getReportsByProject: (projectId: string) => DailySiteReport[];
  getReportsByDate: (isoDate: string) => DailySiteReport[];
  getLatestReports: (limit?: number) => DailySiteReport[];
  getTodayReportForProject: (projectId: string) => DailySiteReport | undefined;
  getTotalWorkersForDate: (isoDate: string) => number;
  markReportStatus: (id: string, status: DailyReportStatus) => Promise<void>;
  refreshReports: () => Promise<void>;
}

const DailyReportContext = createContext<DailyReportContextValue | undefined>(undefined);

function buildReport(
  form: DailyReportFormData,
  base: Pick<DailySiteReport, 'id' | 'referenceNumber' | 'status' | 'isDraft' | 'createdAt'> & {
    submittedAt?: string;
    approvedAt?: string;
  },
  updatedAt: string,
): DailySiteReport {
  return {
    id: base.id,
    referenceNumber: base.referenceNumber,
    projectId: form.projectId,
    reportDate: form.reportDate,
    shift: form.shift,
    status: base.status,
    // Weather and site condition are guaranteed at submit time; the defaults
    // only ever apply to incomplete drafts.
    weather: form.weather ?? 'SUNNY',
    minimumTemperature: parseOptionalNumber(form.minimumTemperature),
    maximumTemperature: parseOptionalNumber(form.maximumTemperature),
    siteCondition: form.siteCondition ?? 'NORMAL',
    workStartTime: form.workStartTime.trim() === '' ? undefined : form.workStartTime.trim(),
    workEndTime: form.workEndTime.trim() === '' ? undefined : form.workEndTime.trim(),
    workforce: form.workforce,
    activities: form.activities,
    materialDeliveries: form.materialDeliveries,
    equipment: form.equipment,
    safetyBriefingCompleted: form.safetyBriefingCompleted,
    accidentOccurred: form.accidentOccurred,
    accidentDescription: form.accidentOccurred
      ? form.accidentDescription.trim() || undefined
      : undefined,
    safetyNotes: form.safetyNotes.trim(),
    delayOccurred: form.delayOccurred,
    delayReason: form.delayOccurred ? form.delayReason.trim() || undefined : undefined,
    visitorCount: parseCount(form.visitorCount),
    generalNotes: form.generalNotes.trim(),
    photos: form.photos,
    linkedIssueIds: form.linkedIssueIds,
    createdBy: CREATED_BY,
    createdAt: base.createdAt,
    updatedAt,
    submittedAt: base.submittedAt,
    approvedAt: base.approvedAt,
    isDraft: base.isDraft,
  };
}

export function DailyReportProvider({ children }: { children: React.ReactNode }) {
  const [allReports, setAllReports] = useState<DailySiteReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // Latest-state mirror (see IssueContext for the rationale): mutations build
  // from this ref, advanced synchronously, so sequential writes never overwrite
  // newer state with an older snapshot.
  const reportsRef = useRef<DailySiteReport[]>([]);

  const commit = useCallback((next: DailySiteReport[]) => {
    reportsRef.current = next;
    setAllReports(next);
  }, []);

  const persist = useCallback(
    async (
      build: (prev: DailySiteReport[]) => DailySiteReport[],
    ): Promise<DailySiteReport[]> => {
      const next = build(reportsRef.current);
      commit(next);
      await saveDailyReports(next);
      return next;
    },
    [commit],
  );

  const load = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setLoadError(false);
    try {
      const result = await loadDailyReports();
      switch (result.status) {
        case 'empty':
          // First launch only: seed once. Never re-seeds over user data.
          commit(MOCK_DAILY_REPORTS);
          try {
            await saveDailyReports(MOCK_DAILY_REPORTS);
          } catch {
            // Seed stays in memory; re-persists on the next write.
          }
          break;
        case 'ok':
          commit(result.items);
          if (result.migrated) {
            try {
              await saveDailyReports(result.items);
            } catch {
              // Non-fatal: valid in memory, re-persists on next write.
            }
          }
          break;
        default:
          // malformed | unsupported | error — never seed or clear unreadable
          // data; surface a recoverable error state instead.
          setLoadError(true);
          break;
      }
    } catch {
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, [commit]);

  useEffect(() => {
    void load();
  }, [load]);

  const addReport = useCallback(
    async (form: DailyReportFormData): Promise<DailySiteReport> => {
      const timestamp = nowIso();
      let created!: DailySiteReport;
      await persist((prev) => {
        created = buildReport(
          form,
          {
            id: generateId('report'),
            referenceNumber: generateReferenceNumber(prev),
            status: 'SUBMITTED',
            isDraft: false,
            createdAt: timestamp,
            submittedAt: timestamp,
          },
          timestamp,
        );
        return [created, ...prev];
      });
      return created;
    },
    [persist],
  );

  const submitReportFromDraft = useCallback(
    async (form: DailyReportFormData, draftId?: string): Promise<DailySiteReport> => {
      const timestamp = nowIso();
      let created!: DailySiteReport;
      await persist((prev) => {
        const draft = draftId ? prev.find((r) => r.id === draftId && r.isDraft) : undefined;
        const withoutDraft = draft ? prev.filter((r) => r.id !== draft.id) : prev;
        created = buildReport(
          form,
          {
            // Preserve the draft's id and creation time when promoting it.
            id: draft?.id ?? generateId('report'),
            referenceNumber: generateReferenceNumber(withoutDraft),
            status: 'SUBMITTED',
            isDraft: false,
            createdAt: draft?.createdAt ?? timestamp,
            submittedAt: timestamp,
          },
          timestamp,
        );
        return [created, ...withoutDraft];
      });
      return created;
    },
    [persist],
  );

  const saveDraft = useCallback(
    async (form: DailyReportFormData, draftId?: string): Promise<DailySiteReport> => {
      const timestamp = nowIso();
      let draft!: DailySiteReport;
      await persist((prev) => {
        const existing = draftId ? prev.find((r) => r.id === draftId) : undefined;
        draft = buildReport(
          form,
          {
            id: existing?.id ?? generateId('draft'),
            referenceNumber: existing?.referenceNumber ?? '',
            status: 'DRAFT',
            isDraft: true,
            createdAt: existing?.createdAt ?? timestamp,
          },
          timestamp,
        );
        return existing
          ? prev.map((r) => (r.id === existing.id ? draft : r))
          : [draft, ...prev];
      });
      return draft;
    },
    [persist],
  );

  const updateReport = useCallback(
    async (id: string, updates: Partial<DailySiteReport>): Promise<void> => {
      await persist((prev) =>
        prev.map((report) =>
          report.id === id ? { ...report, ...updates, updatedAt: nowIso() } : report,
        ),
      );
    },
    [persist],
  );

  const deleteDraft = useCallback(
    async (id: string): Promise<void> => {
      await persist((prev) => prev.filter((r) => !(r.id === id && r.isDraft)));
    },
    [persist],
  );

  const markReportStatus = useCallback(
    async (id: string, status: DailyReportStatus): Promise<void> => {
      const timestamp = nowIso();
      await persist((prev) =>
        prev.map((report) => {
          if (report.id !== id) return report;
          return {
            ...report,
            status,
            isDraft: status === 'DRAFT',
            approvedAt: status === 'APPROVED' ? timestamp : report.approvedAt,
            updatedAt: timestamp,
          };
        }),
      );
    },
    [persist],
  );

  const getReportById = useCallback(
    (id: string): DailySiteReport | undefined => allReports.find((r) => r.id === id),
    [allReports],
  );

  const getReportsByProject = useCallback(
    (projectId: string): DailySiteReport[] =>
      allReports.filter((r) => r.projectId === projectId && !r.isDraft),
    [allReports],
  );

  const getReportsByDate = useCallback(
    (isoDate: string): DailySiteReport[] =>
      allReports.filter((r) => r.reportDate === isoDate && !r.isDraft),
    [allReports],
  );

  const getLatestReports = useCallback(
    (limit?: number): DailySiteReport[] => {
      const sorted = allReports
        .filter((r) => !r.isDraft)
        .sort((a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime());
      return limit === undefined ? sorted : sorted.slice(0, limit);
    },
    [allReports],
  );

  const getTodayReportForProject = useCallback(
    (projectId: string): DailySiteReport | undefined =>
      allReports.find((r) => r.projectId === projectId && !r.isDraft && isDateToday(r.reportDate)),
    [allReports],
  );

  const getTotalWorkersForDate = useCallback(
    (isoDate: string): number =>
      allReports
        .filter((r) => r.reportDate === isoDate && !r.isDraft)
        .reduce((sum, r) => sum + totalWorkers(r.workforce), 0),
    [allReports],
  );

  const reports = useMemo(() => allReports.filter((r) => !r.isDraft), [allReports]);
  const drafts = useMemo(() => allReports.filter((r) => r.isDraft), [allReports]);

  const value = useMemo<DailyReportContextValue>(
    () => ({
      reports,
      drafts,
      isLoading,
      loadError,
      addReport,
      submitReportFromDraft,
      saveDraft,
      updateReport,
      deleteDraft,
      getReportById,
      getReportsByProject,
      getReportsByDate,
      getLatestReports,
      getTodayReportForProject,
      getTotalWorkersForDate,
      markReportStatus,
      refreshReports: load,
    }),
    [
      reports,
      drafts,
      isLoading,
      loadError,
      addReport,
      submitReportFromDraft,
      saveDraft,
      updateReport,
      deleteDraft,
      getReportById,
      getReportsByProject,
      getReportsByDate,
      getLatestReports,
      getTodayReportForProject,
      getTotalWorkersForDate,
      markReportStatus,
      load,
    ],
  );

  return <DailyReportContext.Provider value={value}>{children}</DailyReportContext.Provider>;
}

export function useDailyReports(): DailyReportContextValue {
  const ctx = useContext(DailyReportContext);
  if (ctx === undefined) {
    throw new Error('useDailyReports must be used within a DailyReportProvider');
  }
  return ctx;
}
