import {
  ISSUE_CATEGORIES,
  ISSUE_SEVERITIES,
  type ConstructionIssue,
  type IssuePhoto,
  type IssueStatus,
} from '@/src/types/issue';
import {
  EQUIPMENT_STATUSES,
  SITE_CONDITIONS,
  WEATHER_CONDITIONS,
  WORK_ACTIVITY_STATUSES,
  WORK_SHIFTS,
  type DailySiteReport,
  type DailyReportStatus,
  type EquipmentEntry,
  type MaterialDelivery,
  type WorkActivity,
  type WorkforceEntry,
} from '@/src/types/dailyReport';

/**
 * Runtime validators for data read back from AsyncStorage. Stored data is an
 * untrusted trust boundary (older schemas, partial writes, tampering), so every
 * element is checked before it reaches the UI — replacing the previous unsafe
 * `as ConstructionIssue[]` / `as DailySiteReport[]` casts.
 *
 * All functions are pure and exported so they can be unit-tested directly.
 */

// ---- Primitive guards ---------------------------------------------------

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function isString(value: unknown): value is string {
  return typeof value === 'string';
}
function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}
function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}
function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}
function isOneOf<T extends string>(options: readonly T[], value: unknown): value is T {
  return isString(value) && (options as readonly string[]).includes(value);
}
function isOptionalString(value: unknown): boolean {
  return value === undefined || isString(value);
}
function isOptionalFiniteNumber(value: unknown): boolean {
  return value === undefined || isFiniteNumber(value);
}

// Statuses have no exported runtime arrays in the type modules; declare them
// here, typed against the source unions so they cannot silently drift.
const ISSUE_STATUSES: readonly IssueStatus[] = [
  'DRAFT',
  'OPEN',
  'IN_PROGRESS',
  'WAITING_APPROVAL',
  'RESOLVED',
  'CLOSED',
];
const REPORT_STATUSES: readonly DailyReportStatus[] = [
  'DRAFT',
  'SUBMITTED',
  'APPROVED',
  'REJECTED',
];

// ---- Shared photo guard -------------------------------------------------

export function isValidPhoto(value: unknown): value is IssuePhoto {
  if (!isObject(value)) return false;
  return (
    isString(value.id) &&
    isString(value.uri) &&
    isString(value.createdAt) &&
    isOptionalFiniteNumber(value.width) &&
    isOptionalFiniteNumber(value.height) &&
    isOptionalString(value.fileName)
  );
}

function everyValid<T>(value: unknown, guard: (item: unknown) => item is T): value is T[] {
  return isArray(value) && value.every(guard);
}

// ---- Issue validation ---------------------------------------------------

export function isValidIssue(value: unknown): value is ConstructionIssue {
  if (!isObject(value)) return false;
  return (
    isString(value.id) &&
    isString(value.referenceNumber) &&
    isString(value.projectId) &&
    isString(value.blockId) &&
    isString(value.blockName) &&
    isString(value.floor) &&
    isString(value.area) &&
    isOneOf(ISSUE_CATEGORIES, value.category) &&
    isString(value.title) &&
    isString(value.description) &&
    isOneOf(ISSUE_SEVERITIES, value.severity) &&
    isOneOf(ISSUE_STATUSES, value.status) &&
    isString(value.assignedTeam) &&
    (value.dueDate === null || isString(value.dueDate)) &&
    everyValid(value.photos, isValidPhoto) &&
    isString(value.createdBy) &&
    isString(value.createdAt) &&
    isString(value.updatedAt) &&
    isOptionalString(value.submittedAt) &&
    isBoolean(value.isDraft)
  );
}

/** Returns only the valid issue elements from arbitrary stored input. */
export function parseStoredIssues(raw: unknown): ConstructionIssue[] {
  if (!isArray(raw)) return [];
  return raw.filter(isValidIssue);
}

// ---- Daily-report nested validation -------------------------------------

function isWorkforceEntry(value: unknown): value is WorkforceEntry {
  if (!isObject(value)) return false;
  return (
    isString(value.id) &&
    isString(value.trade) &&
    isString(value.company) &&
    isFiniteNumber(value.workerCount) &&
    isOptionalString(value.supervisorName) &&
    isOptionalString(value.notes)
  );
}

function isWorkActivity(value: unknown): value is WorkActivity {
  if (!isObject(value)) return false;
  return (
    isString(value.id) &&
    isString(value.title) &&
    isString(value.description) &&
    isFiniteNumber(value.progressPercentage) &&
    isOneOf(WORK_ACTIVITY_STATUSES, value.status) &&
    isOptionalString(value.blockId) &&
    isOptionalString(value.blockName) &&
    isOptionalString(value.floor) &&
    isOptionalString(value.notes)
  );
}

function isMaterialDelivery(value: unknown): value is MaterialDelivery {
  if (!isObject(value)) return false;
  return (
    isString(value.id) &&
    isString(value.materialName) &&
    isFiniteNumber(value.quantity) &&
    isString(value.unit) &&
    isString(value.supplier) &&
    isOptionalString(value.deliveryNoteNumber) &&
    isOptionalString(value.receivedBy) &&
    isOptionalString(value.notes)
  );
}

function isEquipmentEntry(value: unknown): value is EquipmentEntry {
  if (!isObject(value)) return false;
  return (
    isString(value.id) &&
    isString(value.equipmentName) &&
    isFiniteNumber(value.quantity) &&
    isOneOf(EQUIPMENT_STATUSES, value.status) &&
    isOptionalFiniteNumber(value.operatingHours) &&
    isOptionalString(value.notes)
  );
}

function isStringArray(value: unknown): value is string[] {
  return isArray(value) && value.every(isString);
}

// ---- Daily-report validation --------------------------------------------

export function isValidReport(value: unknown): value is DailySiteReport {
  if (!isObject(value)) return false;
  return (
    isString(value.id) &&
    isString(value.referenceNumber) &&
    isString(value.projectId) &&
    isString(value.reportDate) &&
    isOneOf(WORK_SHIFTS, value.shift) &&
    isOneOf(REPORT_STATUSES, value.status) &&
    isOneOf(WEATHER_CONDITIONS, value.weather) &&
    isOptionalFiniteNumber(value.minimumTemperature) &&
    isOptionalFiniteNumber(value.maximumTemperature) &&
    isOneOf(SITE_CONDITIONS, value.siteCondition) &&
    isOptionalString(value.workStartTime) &&
    isOptionalString(value.workEndTime) &&
    everyValid(value.workforce, isWorkforceEntry) &&
    everyValid(value.activities, isWorkActivity) &&
    everyValid(value.materialDeliveries, isMaterialDelivery) &&
    everyValid(value.equipment, isEquipmentEntry) &&
    isBoolean(value.safetyBriefingCompleted) &&
    isBoolean(value.accidentOccurred) &&
    isOptionalString(value.accidentDescription) &&
    isString(value.safetyNotes) &&
    isBoolean(value.delayOccurred) &&
    isOptionalString(value.delayReason) &&
    isFiniteNumber(value.visitorCount) &&
    isString(value.generalNotes) &&
    everyValid(value.photos, isValidPhoto) &&
    isStringArray(value.linkedIssueIds) &&
    isString(value.createdBy) &&
    isString(value.createdAt) &&
    isString(value.updatedAt) &&
    isOptionalString(value.submittedAt) &&
    isOptionalString(value.approvedAt) &&
    isBoolean(value.isDraft)
  );
}

/** Returns only the valid daily-report elements from arbitrary stored input. */
export function parseStoredReports(raw: unknown): DailySiteReport[] {
  if (!isArray(raw)) return [];
  return raw.filter(isValidReport);
}
