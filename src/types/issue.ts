export type IssueCategory =
  | 'STRUCTURAL'
  | 'ELECTRICAL'
  | 'PLUMBING'
  | 'FINISHING'
  | 'SAFETY'
  | 'MATERIAL'
  | 'OTHER';

export type IssueSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type IssueStatus =
  | 'DRAFT'
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'WAITING_APPROVAL'
  | 'RESOLVED'
  | 'CLOSED';

export interface IssuePhoto {
  id: string;
  uri: string;
  width?: number;
  height?: number;
  fileName?: string;
  createdAt: string;
}

export interface ConstructionIssue {
  id: string;
  referenceNumber: string;
  projectId: string;
  blockId: string;
  blockName: string;
  floor: string;
  area: string;
  category: IssueCategory;
  title: string;
  description: string;
  severity: IssueSeverity;
  status: IssueStatus;
  assignedTeam: string;
  dueDate: string | null;
  photos: IssuePhoto[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  isDraft: boolean;
}

/**
 * Validated form payload used when submitting a finished report.
 * Category and severity are guaranteed to be set at submit time.
 */
export interface IssueFormData {
  projectId: string;
  blockId: string;
  blockName: string;
  floor: string;
  area: string;
  category: IssueCategory;
  title: string;
  description: string;
  severity: IssueSeverity;
  assignedTeam: string;
  dueDate: string | null;
  photos: IssuePhoto[];
}

/**
 * Loose form state used while the user is still filling in the report.
 * Drafts may be saved at any point, so category and severity can be null.
 */
export interface IssueDraftInput {
  projectId: string;
  blockId: string;
  blockName: string;
  floor: string;
  area: string;
  category: IssueCategory | null;
  title: string;
  description: string;
  severity: IssueSeverity | null;
  assignedTeam: string;
  dueDate: string | null;
  photos: IssuePhoto[];
}

export const ISSUE_CATEGORIES: IssueCategory[] = [
  'STRUCTURAL',
  'ELECTRICAL',
  'PLUMBING',
  'FINISHING',
  'SAFETY',
  'MATERIAL',
  'OTHER',
];

export const ISSUE_SEVERITIES: IssueSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export const CATEGORY_LABELS: Record<IssueCategory, string> = {
  STRUCTURAL: 'Structural',
  ELECTRICAL: 'Electrical',
  PLUMBING: 'Plumbing',
  FINISHING: 'Finishing',
  SAFETY: 'Safety',
  MATERIAL: 'Material',
  OTHER: 'Other',
};

export const ASSIGNABLE_TEAMS: string[] = [
  'Structural Team',
  'Electrical Team',
  'Plumbing Team',
  'Finishing Team',
  'Safety Team',
  'Main Contractor',
  'Subcontractor',
  'Unassigned',
];
