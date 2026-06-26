// Small, typed fixture factories shared across the test suites.
//
// Each factory returns a *minimal but valid* record and accepts a `Partial`
// override so individual tests vary only the fields they care about — avoiding
// duplicated, copy-pasted object literals (and the full mock database) in every
// test. All sample values are obviously fake (no real secrets or PII).

import type {
  ConstructionIssue,
  IssueFormData,
  IssuePhoto,
} from '@/src/types/issue';
import type {
  DailyReportFormData,
  DailySiteReport,
  WorkforceEntry,
} from '@/src/types/dailyReport';

const ISO = '2026-06-20T08:00:00.000Z';

export function makePhoto(overrides: Partial<IssuePhoto> = {}): IssuePhoto {
  return {
    id: 'photo-1',
    uri: 'file:///tmp/photo-1.jpg',
    width: 1280,
    height: 960,
    fileName: 'photo-1.jpg',
    createdAt: ISO,
    ...overrides,
  };
}

export function makeWorkforce(overrides: Partial<WorkforceEntry> = {}): WorkforceEntry {
  return {
    id: 'wf-1',
    trade: 'Concrete',
    company: 'Acme Subcontractors',
    workerCount: 6,
    ...overrides,
  };
}

export function makeIssue(overrides: Partial<ConstructionIssue> = {}): ConstructionIssue {
  return {
    id: 'issue-1',
    referenceNumber: 'DEF-2026-001',
    projectId: 'project-1',
    blockId: 'block-a',
    blockName: 'Block A',
    floor: 'L1',
    area: 'Lobby',
    category: 'STRUCTURAL',
    title: 'Cracked beam',
    description: 'Hairline crack observed on the south beam.',
    severity: 'HIGH',
    status: 'OPEN',
    assignedTeam: 'Structural Team',
    dueDate: null,
    photos: [],
    createdBy: 'demo@example.com',
    createdAt: ISO,
    updatedAt: ISO,
    submittedAt: ISO,
    isDraft: false,
    ...overrides,
  };
}

export function makeIssueForm(overrides: Partial<IssueFormData> = {}): IssueFormData {
  return {
    projectId: 'project-1',
    blockId: 'block-a',
    blockName: 'Block A',
    floor: 'L1',
    area: 'Lobby',
    category: 'STRUCTURAL',
    title: 'Cracked beam',
    description: 'Hairline crack observed on the south beam.',
    severity: 'HIGH',
    assignedTeam: 'Structural Team',
    dueDate: null,
    photos: [],
    ...overrides,
  };
}

export function makeReport(overrides: Partial<DailySiteReport> = {}): DailySiteReport {
  return {
    id: 'report-1',
    referenceNumber: 'DSR-2026-001',
    projectId: 'project-1',
    reportDate: '2026-06-20',
    shift: 'DAY',
    status: 'SUBMITTED',
    weather: 'SUNNY',
    siteCondition: 'NORMAL',
    workforce: [],
    activities: [],
    materialDeliveries: [],
    equipment: [],
    safetyBriefingCompleted: true,
    accidentOccurred: false,
    safetyNotes: '',
    delayOccurred: false,
    visitorCount: 0,
    generalNotes: '',
    photos: [],
    linkedIssueIds: [],
    createdBy: 'demo@example.com',
    createdAt: ISO,
    updatedAt: ISO,
    submittedAt: ISO,
    isDraft: false,
    ...overrides,
  };
}

export function makeReportForm(
  overrides: Partial<DailyReportFormData> = {},
): DailyReportFormData {
  return {
    projectId: 'project-1',
    reportDate: '2026-06-20',
    shift: 'DAY',
    weather: 'SUNNY',
    minimumTemperature: '',
    maximumTemperature: '',
    siteCondition: 'NORMAL',
    workStartTime: '',
    workEndTime: '',
    workforce: [],
    activities: [],
    materialDeliveries: [],
    equipment: [],
    safetyBriefingCompleted: true,
    accidentOccurred: false,
    accidentDescription: '',
    safetyNotes: '',
    delayOccurred: false,
    delayReason: '',
    visitorCount: '0',
    generalNotes: '',
    photos: [],
    linkedIssueIds: [],
    ...overrides,
  };
}
