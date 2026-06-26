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
  loadError: boolean;
  addIssue: (form: IssueFormData) => Promise<ConstructionIssue>;
  /**
   * Submits a finished issue. When `draftId` refers to an existing draft, that
   * draft is removed and replaced by the submitted record in a single atomic
   * update + persist — preventing the draft-resurrection race. The draft's id
   * and original `createdAt` are preserved.
   */
  submitIssueFromDraft: (form: IssueFormData, draftId?: string) => Promise<ConstructionIssue>;
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
  const [loadError, setLoadError] = useState(false);

  // Mirror of the collection kept in a ref so mutations always build from the
  // very latest state. Reading from a captured render snapshot is what caused
  // the draft-resurrection race; the ref is updated synchronously below.
  const issuesRef = useRef<ConstructionIssue[]>([]);

  const commit = useCallback((next: ConstructionIssue[]) => {
    issuesRef.current = next;
    setAllIssues(next);
  }, []);

  // Build the next collection from the latest state, commit it to memory, then
  // persist. The ref is advanced synchronously before the await so rapid
  // sequential mutations chain on the newest collection rather than a stale
  // snapshot. A write failure rejects so callers can surface a safe error
  // (the optimistic in-memory update is intentional and is not silent).
  const persist = useCallback(
    async (
      build: (prev: ConstructionIssue[]) => ConstructionIssue[],
    ): Promise<ConstructionIssue[]> => {
      const next = build(issuesRef.current);
      commit(next);
      await saveIssues(next);
      return next;
    },
    [commit],
  );

  const load = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setLoadError(false);
    try {
      const result = await loadIssues();
      switch (result.status) {
        case 'empty':
          // First launch only: seed once. Reached solely when nothing has ever
          // been stored, so user data is never clobbered or duplicated.
          commit(MOCK_ISSUES);
          try {
            await saveIssues(MOCK_ISSUES);
          } catch {
            // Seed stays in memory; it will be re-persisted on the next write.
          }
          break;
        case 'ok':
          commit(result.items);
          if (result.migrated) {
            // Upgrade legacy/older payloads into the current envelope.
            try {
              await saveIssues(result.items);
            } catch {
              // Non-fatal: data is valid in memory and re-persists on next write.
            }
          }
          break;
        default:
          // malformed | unsupported | error — never seed or clear over data we
          // cannot read; surface a recoverable error state instead.
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

  const addIssue = useCallback(
    async (form: IssueFormData): Promise<ConstructionIssue> => {
      const timestamp = nowIso();
      let created!: ConstructionIssue;
      await persist((prev) => {
        created = {
          id: generateId('issue'),
          referenceNumber: generateReferenceNumber(form.category, prev),
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
        return [created, ...prev];
      });
      return created;
    },
    [persist],
  );

  const submitIssueFromDraft = useCallback(
    async (form: IssueFormData, draftId?: string): Promise<ConstructionIssue> => {
      const timestamp = nowIso();
      let created!: ConstructionIssue;
      await persist((prev) => {
        // Resolve the draft from the latest state and remove it; the submitted
        // record replaces it in the same update so no stale copy survives.
        const draft = draftId ? prev.find((i) => i.id === draftId && i.isDraft) : undefined;
        const withoutDraft = draft ? prev.filter((i) => i.id !== draft.id) : prev;
        created = {
          // Preserve the draft's id and creation time when promoting it.
          id: draft?.id ?? generateId('issue'),
          referenceNumber: generateReferenceNumber(form.category, withoutDraft),
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
          createdAt: draft?.createdAt ?? timestamp,
          updatedAt: timestamp,
          submittedAt: timestamp,
          isDraft: false,
        };
        return [created, ...withoutDraft];
      });
      return created;
    },
    [persist],
  );

  const saveDraft = useCallback(
    async (input: IssueDraftInput, draftId?: string): Promise<ConstructionIssue> => {
      const timestamp = nowIso();
      let draft!: ConstructionIssue;
      await persist((prev) => {
        const existing = draftId ? prev.find((i) => i.id === draftId) : undefined;
        draft = {
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
        return existing
          ? prev.map((i) => (i.id === existing.id ? draft : i))
          : [draft, ...prev];
      });
      return draft;
    },
    [persist],
  );

  const updateIssue = useCallback(
    async (id: string, updates: Partial<ConstructionIssue>): Promise<void> => {
      await persist((prev) =>
        prev.map((issue) =>
          issue.id === id ? { ...issue, ...updates, updatedAt: nowIso() } : issue,
        ),
      );
    },
    [persist],
  );

  const deleteDraft = useCallback(
    async (id: string): Promise<void> => {
      await persist((prev) => prev.filter((issue) => !(issue.id === id && issue.isDraft)));
    },
    [persist],
  );

  const markIssueStatus = useCallback(
    async (id: string, status: IssueStatus): Promise<void> => {
      const timestamp = nowIso();
      await persist((prev) =>
        prev.map((issue) => {
          if (issue.id !== id) return issue;
          return {
            ...issue,
            status,
            isDraft: status === 'DRAFT',
            updatedAt: timestamp,
          };
        }),
      );
    },
    [persist],
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
      loadError,
      addIssue,
      submitIssueFromDraft,
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
      loadError,
      addIssue,
      submitIssueFromDraft,
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
