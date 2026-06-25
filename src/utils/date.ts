export type DueDatePreset = 'TODAY' | 'TOMORROW' | 'IN_3_DAYS' | 'IN_7_DAYS' | 'NONE';

const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

/**
 * Formats an ISO date string into a readable English date, e.g. "25 Jun 2026".
 * Returns a safe fallback when the input is missing or invalid.
 */
export function formatDisplayDate(value: string | null | undefined): string {
  const date = parseDate(value);
  if (!date) return '—';
  const day = date.getDate();
  const month = MONTHS_SHORT[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Formats an ISO date string into a relative description, e.g. "2 hours ago"
 * or "in 3 days". Returns a safe fallback when the input is invalid.
 */
export function formatRelativeTime(value: string | null | undefined): string {
  const date = parseDate(value);
  if (!date) return '—';

  const now = Date.now();
  const diffMs = date.getTime() - now;
  const past = diffMs <= 0;
  const absSec = Math.floor(Math.abs(diffMs) / 1000);

  const minute = 60;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;

  const build = (amount: number, unit: string): string => {
    const plural = amount === 1 ? unit : `${unit}s`;
    return past ? `${amount} ${plural} ago` : `in ${amount} ${plural}`;
  };

  if (absSec < minute) return past ? 'Just now' : 'In a moment';
  if (absSec < hour) return build(Math.floor(absSec / minute), 'minute');
  if (absSec < day) return build(Math.floor(absSec / hour), 'hour');
  if (absSec < week) return build(Math.floor(absSec / day), 'day');
  return formatDisplayDate(date.toISOString());
}

/**
 * Converts a due-date preset into an ISO date string (or null for "No due date").
 * Times are normalised to end-of-day so a due date stays valid for the whole day.
 */
export function createDueDateFromPreset(preset: DueDatePreset): string | null {
  if (preset === 'NONE') return null;

  const date = new Date();
  date.setHours(23, 59, 0, 0);

  switch (preset) {
    case 'TODAY':
      break;
    case 'TOMORROW':
      date.setDate(date.getDate() + 1);
      break;
    case 'IN_3_DAYS':
      date.setDate(date.getDate() + 3);
      break;
    case 'IN_7_DAYS':
      date.setDate(date.getDate() + 7);
      break;
  }

  return date.toISOString();
}

const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Returns today's date as an ISO calendar date string (YYYY-MM-DD), local time. */
export function getTodayISODate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats a report date (ISO date or datetime) into a readable label,
 * e.g. "Mon, 22 Jun 2026". Returns a safe fallback for invalid input.
 */
export function formatReportDate(value: string | null | undefined): string {
  const date = parseDate(value);
  if (!date) return '—';
  const weekday = WEEKDAYS_SHORT[date.getDay()];
  const day = date.getDate();
  const month = MONTHS_SHORT[date.getMonth()];
  const year = date.getFullYear();
  return `${weekday}, ${day} ${month} ${year}`;
}

/** True when the given date falls on the current calendar day (local time). */
export function isDateToday(value: string | null | undefined): boolean {
  const date = parseDate(value);
  if (!date) return false;
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

/** True when the given date is within the last `days` days (inclusive of today). */
export function isWithinLastDays(value: string | null | undefined, days: number): boolean {
  const date = parseDate(value);
  if (!date) return false;
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);
  return date.getTime() >= start.getTime() && date.getTime() <= end.getTime();
}

/**
 * Calculates a readable work duration between two "HH:MM" times, e.g. "9h 30m".
 * Handles overnight shifts (end earlier than start) by adding 24 hours.
 * Returns a safe fallback when either time is missing or malformed.
 */
export function calculateWorkDuration(
  start: string | null | undefined,
  end: string | null | undefined,
): string {
  const parseTime = (value: string | null | undefined): number | null => {
    if (!value) return null;
    const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
    if (!match) return null;
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    if (hours > 23 || minutes > 59) return null;
    return hours * 60 + minutes;
  };

  const startMin = parseTime(start);
  const endMin = parseTime(end);
  if (startMin === null || endMin === null) return '—';

  let diff = endMin - startMin;
  if (diff < 0) diff += 24 * 60; // overnight shift
  if (diff === 0) return '0h';

  const hours = Math.floor(diff / 60);
  const minutes = diff % 60;
  if (minutes === 0) return `${hours}h`;
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}
