import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type {
  ConstructionIssue,
  IssueCategory,
  IssueDraftInput,
  IssueFormData,
  IssueStatus,
} from '@/src/types/issue';
import { MOCK_ISSUES } from '@/src/data/issues';
import { loadIssues, saveIssues } from '@/src/utils/issueStorage';

const CREATED_BY = 'Berke Deveci';

function nowIso(): string {
  return new Date().toISOString();
}

function generateId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}-${random}`;
}

/**
 * Builds the next readable reference number (e.g. DEF-2026-009 / SAF-2026-010).
 * SAFETY issues use the SAF prefix; everything else uses DEF. The numeric
 * sequence is shared across both prefixes and derived from existing issues.
 */
function generateReferenceNumber(
  category: IssueCategory,
  existing: ConstructionIssue[],
): string {
  const prefix = category === 'SAFETY' ? 'SAF' : 'DEF';
  const year = new Date().getFullYear();

  let maxSequence = 0;
  for (const issue of existing) {
    const match = /^(?:DEF|SAF)-\d{4}-(\d+)$/.exec(issue.referenceNumber);
    if (match) {
      const seq = parseInt(match[1], 10);
      if (!Number.isNaN(seq) && seq > maxSequence) {
        maxSequence = seq;
      }
    }
  }

  const next = (maxSequence + 1).toString().padStart(3, '0');
  return `${prefix}-${year}-${next}`;
}

interface IssueContextValue {
  issues: ConstructionIssue[];
  drafts: ConstructionIssue[];
  isLoading: boolean;
  addIssue: (form: IssueFormData) => Promise<ConstructionIssue>;
  saveDraft: (input: IssueDraftInput, draftId?: string) => Promise<ConstructionIssue>;
  updateIssue: (id: string, updates: Partial<ConstructionIssue>) => Promise<void>;
  deleteDraft: (id: string) => Promise<void>;
  getIssueById: (id: string) => ConstructionIssue | undefined;
  getIssuesByProject: (projectId: string) => ConstructionIssue[];
  getOpenIssueCount: (projectId?: string) => number;
  markIssueStatus: (id: string, status: IssueStatus) => Promise<void>;
  refreshIssues: () => Promise<void>;
}

const IssueContext = createContext<IssueContextValue | undefined>(undefined);

const OPEN_STATUSES: IssueStatus[] = ['OPEN', 'IN_PROGRESS', 'WAITING_APPROVAL'];

export function IssueProvider({ children }: { children: React.ReactNode }) {
  const [allIssues, setAllIssues] = useState<ConstructionIssue[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Persist helper: update React state and AsyncStorage together so the two
  // never drift apart. Storage failures are handled inside saveIssues.
  const persist = useCallback(
    async (next: ConstructionIssue[]): Promise<void> => {
      setAllIssues(next);
      await saveIssues(next);
    },
    [],
  );

  const load = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    const stored = await loadIssues();
    if (stored === null) {
      // First launch: seed the store once. Guarded by the null check so we
      // never re-seed over user data on subsequent launches.
      setAllIssues(MOCK_ISSUES);
      await saveIssues(MOCK_ISSUES);
    } else {
      setAllIssues(stored);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const addIssue = useCallback(
    async (form: IssueFormData): Promise<ConstructionIssue> => {
      const timestamp = nowIso();
      const issue: ConstructionIssue = {
        id: generateId('issue'),
        referenceNumber: generateReferenceNumber(form.category, allIssues),
        projectId: form.projectId,
        blockId: form.blockId,
        blockName: form.blockName,
        floor: form.floor,
        area: form.area,
        category: form.category,
        title: form.title.trim(),
        description: form.description.trim(),
        severity: form.severity,
        status: 'OPEN',
        assignedTeam: form.assignedTeam,
        dueDate: form.dueDate,
        photos: form.photos,
        createdBy: CREATED_BY,
        createdAt: timestamp,
        updatedAt: timestamp,
        submittedAt: timestamp,
        isDraft: false,
      };
      await persist([issue, ...allIssues]);
      return issue;
    },
    [allIssues, persist],
  );

  const saveDraft = useCallback(
    async (input: IssueDraftInput, draftId?: string): Promise<ConstructionIssue> => {
      const timestamp = nowIso();
      const existing = draftId ? allIssues.find((i) => i.id === draftId) : undefined;

      const draft: ConstructionIssue = {
        id: existing?.id ?? generateId('draft'),
        referenceNumber: existing?.referenceNumber ?? '',
        projectId: input.projectId,
        blockId: input.blockId,
        blockName: input.blockName,
        floor: input.floor,
        area: input.area,
        // Default the category so the stored model stays strongly typed;
        // OTHER is a sensible placeholder for an unfinished draft.
        category: input.category ?? 'OTHER',
        title: input.title.trim(),
        description: input.description.trim(),
        severity: input.severity ?? 'MEDIUM',
        status: 'DRAFT',
        assignedTeam: input.assignedTeam,
        dueDate: input.dueDate,
        photos: input.photos,
        createdBy: CREATED_BY,
        createdAt: existing?.createdAt ?? timestamp,
        updatedAt: timestamp,
        isDraft: true,
      };

      const next = existing
        ? allIssues.map((i) => (i.id === existing.id ? draft : i))
        : [draft, ...allIssues];
      await persist(next);
      return draft;
    },
    [allIssues, persist],
  );

  const updateIssue = useCallback(
    async (id: string, updates: Partial<ConstructionIssue>): Promise<void> => {
      const next = allIssues.map((issue) =>
        issue.id === id ? { ...issue, ...updates, updatedAt: nowIso() } : issue,
      );
      await persist(next);
    },
    [allIssues, persist],
  );

  const deleteDraft = useCallback(
    async (id: string): Promise<void> => {
      const next = allIssues.filter((issue) => !(issue.id === id && issue.isDraft));
      await persist(next);
    },
    [allIssues, persist],
  );

  const markIssueStatus = useCallback(
    async (id: string, status: IssueStatus): Promise<void> => {
      const timestamp = nowIso();
      const next = allIssues.map((issue) => {
        if (issue.id !== id) return issue;
        return {
          ...issue,
          status,
          isDraft: status === 'DRAFT',
          updatedAt: timestamp,
        };
      });
      await persist(next);
    },
    [allIssues, persist],
  );

  const getIssueById = useCallback(
    (id: string): ConstructionIssue | undefined => allIssues.find((i) => i.id === id),
    [allIssues],
  );

  const getIssuesByProject = useCallback(
    (projectId: string): ConstructionIssue[] =>
      allIssues.filter((i) => i.projectId === projectId && !i.isDraft),
    [allIssues],
  );

  const getOpenIssueCount = useCallback(
    (projectId?: string): number =>
      allIssues.filter(
        (i) =>
          !i.isDraft &&
          OPEN_STATUSES.includes(i.status) &&
          (projectId === undefined || i.projectId === projectId),
      ).length,
    [allIssues],
  );

  const issues = useMemo(() => allIssues.filter((i) => !i.isDraft), [allIssues]);
  const drafts = useMemo(() => allIssues.filter((i) => i.isDraft), [allIssues]);

  const value = useMemo<IssueContextValue>(
    () => ({
      issues,
      drafts,
      isLoading,
      addIssue,
      saveDraft,
      updateIssue,
      deleteDraft,
      getIssueById,
      getIssuesByProject,
      getOpenIssueCount,
      markIssueStatus,
      refreshIssues: load,
    }),
    [
      issues,
      drafts,
      isLoading,
      addIssue,
      saveDraft,
      updateIssue,
      deleteDraft,
      getIssueById,
      getIssuesByProject,
      getOpenIssueCount,
      markIssueStatus,
      load,
    ],
  );

  return <IssueContext.Provider value={value}>{children}</IssueContext.Provider>;
}

export function useIssues(): IssueContextValue {
  const ctx = useContext(IssueContext);
  if (ctx === undefined) {
    throw new Error('useIssues must be used within an IssueProvider');
  }
  return ctx;
}
