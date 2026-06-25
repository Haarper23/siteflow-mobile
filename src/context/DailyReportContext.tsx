import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
  addReport: (form: DailyReportFormData) => Promise<DailySiteReport>;
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

  const persist = useCallback(async (next: DailySiteReport[]): Promise<void> => {
    setAllReports(next);
    await saveDailyReports(next);
  }, []);

  const load = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    const stored = await loadDailyReports();
    if (stored === null) {
      // First launch: seed once. The null guard prevents re-seeding over user data.
      setAllReports(MOCK_DAILY_REPORTS);
      await saveDailyReports(MOCK_DAILY_REPORTS);
    } else {
      setAllReports(stored);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const addReport = useCallback(
    async (form: DailyReportFormData): Promise<DailySiteReport> => {
      const timestamp = nowIso();
      const report = buildReport(
        form,
        {
          id: generateId('report'),
          referenceNumber: generateReferenceNumber(allReports),
          status: 'SUBMITTED',
          isDraft: false,
          createdAt: timestamp,
          submittedAt: timestamp,
        },
        timestamp,
      );
      await persist([report, ...allReports]);
      return report;
    },
    [allReports, persist],
  );

  const saveDraft = useCallback(
    async (form: DailyReportFormData, draftId?: string): Promise<DailySiteReport> => {
      const timestamp = nowIso();
      const existing = draftId ? allReports.find((r) => r.id === draftId) : undefined;

      const draft = buildReport(
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

      const next = existing
        ? allReports.map((r) => (r.id === existing.id ? draft : r))
        : [draft, ...allReports];
      await persist(next);
      return draft;
    },
    [allReports, persist],
  );

  const updateReport = useCallback(
    async (id: string, updates: Partial<DailySiteReport>): Promise<void> => {
      const next = allReports.map((report) =>
        report.id === id ? { ...report, ...updates, updatedAt: nowIso() } : report,
      );
      await persist(next);
    },
    [allReports, persist],
  );

  const deleteDraft = useCallback(
    async (id: string): Promise<void> => {
      const next = allReports.filter((r) => !(r.id === id && r.isDraft));
      await persist(next);
    },
    [allReports, persist],
  );

  const markReportStatus = useCallback(
    async (id: string, status: DailyReportStatus): Promise<void> => {
      const timestamp = nowIso();
      const next = allReports.map((report) => {
        if (report.id !== id) return report;
        return {
          ...report,
          status,
          isDraft: status === 'DRAFT',
          approvedAt: status === 'APPROVED' ? timestamp : report.approvedAt,
          updatedAt: timestamp,
        };
      });
      await persist(next);
    },
    [allReports, persist],
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
      addReport,
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
      addReport,
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
