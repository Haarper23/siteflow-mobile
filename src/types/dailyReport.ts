import type { IssuePhoto } from '@/src/types/issue';

export type DailyReportStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export type WeatherCondition =
  | 'SUNNY'
  | 'PARTLY_CLOUDY'
  | 'CLOUDY'
  | 'RAINY'
  | 'STORMY'
  | 'SNOWY'
  | 'WINDY';

export type SiteCondition = 'NORMAL' | 'MUDDY' | 'WET' | 'DUSTY' | 'RESTRICTED' | 'STOPPED';

export type WorkShift = 'DAY' | 'NIGHT' | 'FULL_DAY';

export type WorkActivityStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';

export type EquipmentStatus = 'ACTIVE' | 'IDLE' | 'MAINTENANCE' | 'OUT_OF_SERVICE';

/** Daily reports reuse the shared photo model. */
export type DailyReportPhoto = IssuePhoto;

export interface WorkforceEntry {
  id: string;
  trade: string;
  company: string;
  workerCount: number;
  supervisorName?: string;
  notes?: string;
}

export interface WorkActivity {
  id: string;
  title: string;
  description: string;
  blockId?: string;
  blockName?: string;
  floor?: string;
  progressPercentage: number;
  status: WorkActivityStatus;
  notes?: string;
}

export interface MaterialDelivery {
  id: string;
  materialName: string;
  quantity: number;
  unit: string;
  supplier: string;
  deliveryNoteNumber?: string;
  receivedBy?: string;
  notes?: string;
}

export interface EquipmentEntry {
  id: string;
  equipmentName: string;
  quantity: number;
  operatingHours?: number;
  status: EquipmentStatus;
  notes?: string;
}

export interface DailySiteReport {
  id: string;
  referenceNumber: string;
  projectId: string;
  reportDate: string; // ISO calendar date (YYYY-MM-DD)
  shift: WorkShift;
  status: DailyReportStatus;
  weather: WeatherCondition;
  minimumTemperature?: number;
  maximumTemperature?: number;
  siteCondition: SiteCondition;
  workStartTime?: string; // "HH:MM"
  workEndTime?: string; // "HH:MM"
  workforce: WorkforceEntry[];
  activities: WorkActivity[];
  materialDeliveries: MaterialDelivery[];
  equipment: EquipmentEntry[];
  safetyBriefingCompleted: boolean;
  accidentOccurred: boolean;
  accidentDescription?: string;
  safetyNotes: string;
  delayOccurred: boolean;
  delayReason?: string;
  visitorCount: number;
  generalNotes: string;
  photos: DailyReportPhoto[];
  linkedIssueIds: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  approvedAt?: string;
  isDraft: boolean;
}

/**
 * Editable form fields for the daily report wizard. Weather/condition/shift are
 * pre-selected with sensible defaults so a brand-new form is already valid-ish,
 * while still allowing incomplete drafts.
 */
export interface DailyReportFormData {
  projectId: string;
  reportDate: string;
  shift: WorkShift;
  weather: WeatherCondition | null;
  minimumTemperature: string;
  maximumTemperature: string;
  siteCondition: SiteCondition | null;
  workStartTime: string;
  workEndTime: string;
  workforce: WorkforceEntry[];
  activities: WorkActivity[];
  materialDeliveries: MaterialDelivery[];
  equipment: EquipmentEntry[];
  safetyBriefingCompleted: boolean;
  accidentOccurred: boolean;
  accidentDescription: string;
  safetyNotes: string;
  delayOccurred: boolean;
  delayReason: string;
  visitorCount: string;
  generalNotes: string;
  photos: DailyReportPhoto[];
  linkedIssueIds: string[];
}

// ---- Display label maps -------------------------------------------------

export const WEATHER_CONDITIONS: WeatherCondition[] = [
  'SUNNY',
  'PARTLY_CLOUDY',
  'CLOUDY',
  'RAINY',
  'STORMY',
  'SNOWY',
  'WINDY',
];

export const WEATHER_LABELS: Record<WeatherCondition, string> = {
  SUNNY: 'Sunny',
  PARTLY_CLOUDY: 'Partly Cloudy',
  CLOUDY: 'Cloudy',
  RAINY: 'Rainy',
  STORMY: 'Stormy',
  SNOWY: 'Snowy',
  WINDY: 'Windy',
};

export const SITE_CONDITIONS: SiteCondition[] = [
  'NORMAL',
  'MUDDY',
  'WET',
  'DUSTY',
  'RESTRICTED',
  'STOPPED',
];

export const SITE_CONDITION_LABELS: Record<SiteCondition, string> = {
  NORMAL: 'Normal',
  MUDDY: 'Muddy',
  WET: 'Wet',
  DUSTY: 'Dusty',
  RESTRICTED: 'Restricted',
  STOPPED: 'Work Stopped',
};

export const WORK_SHIFTS: WorkShift[] = ['DAY', 'NIGHT', 'FULL_DAY'];

export const WORK_SHIFT_LABELS: Record<WorkShift, string> = {
  DAY: 'Day Shift',
  NIGHT: 'Night Shift',
  FULL_DAY: 'Full Day',
};

export const WORK_ACTIVITY_STATUSES: WorkActivityStatus[] = [
  'NOT_STARTED',
  'IN_PROGRESS',
  'COMPLETED',
  'BLOCKED',
];

export const WORK_ACTIVITY_STATUS_LABELS: Record<WorkActivityStatus, string> = {
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  BLOCKED: 'Blocked',
};

export const EQUIPMENT_STATUSES: EquipmentStatus[] = [
  'ACTIVE',
  'IDLE',
  'MAINTENANCE',
  'OUT_OF_SERVICE',
];

export const EQUIPMENT_STATUS_LABELS: Record<EquipmentStatus, string> = {
  ACTIVE: 'Active',
  IDLE: 'Idle',
  MAINTENANCE: 'Maintenance',
  OUT_OF_SERVICE: 'Out of Service',
};

export const WORKFORCE_TRADES: string[] = [
  'General Labor',
  'Structural',
  'Formwork',
  'Reinforcement',
  'Concrete',
  'Electrical',
  'Mechanical',
  'Plumbing',
  'Finishing',
  'Facade',
  'Safety',
  'Surveying',
  'Other',
];

export const MATERIAL_UNITS: string[] = [
  'pcs',
  'kg',
  'ton',
  'm',
  'm²',
  'm³',
  'bag',
  'pallet',
  'liter',
];

export const EQUIPMENT_NAMES: string[] = [
  'Tower Crane',
  'Mobile Crane',
  'Excavator',
  'Concrete Pump',
  'Generator',
  'Forklift',
  'Scaffolding',
  'Compactor',
  'Welding Machine',
  'Other',
];

/** Sums worker counts across all workforce entries. */
export function totalWorkers(workforce: WorkforceEntry[]): number {
  return workforce.reduce((sum, entry) => sum + (entry.workerCount || 0), 0);
}
