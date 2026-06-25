export type ProjectStatus = 'ON_TRACK' | 'AT_RISK' | 'DELAYED' | 'COMPLETED';

export type ActivityType =
  | 'ISSUE_REPORTED'
  | 'TASK_COMPLETED'
  | 'SAFETY_INSPECTION'
  | 'DAILY_REPORT'
  | 'MATERIAL_DELIVERY';

export interface ProjectBlock {
  id: string;
  name: string;
  floorCount: number;
  progress: number;
  openIssueCount: number;
}

export interface ProjectActivity {
  id: string;
  title: string;
  description: string;
  time: string;
  type: ActivityType;
}

export interface Project {
  id: string;
  name: string;
  code: string;
  city: string;
  district: string;
  address: string;
  progress: number;
  status: ProjectStatus;
  openIssueCount: number;
  overdueTaskCount: number;
  safetyAlertCount: number;
  activeWorkerCount: number;
  managerName: string;
  startDate: string;
  targetDate: string;
  description: string;
  blocks: ProjectBlock[];
  recentActivity: ProjectActivity[];
}
