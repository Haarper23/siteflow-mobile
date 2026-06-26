import {
  calculateWorkDuration,
  createDueDateFromPreset,
  formatDisplayDate,
  formatRelativeTime,
  formatReportDate,
  getTodayISODate,
  isDateToday,
  isWithinLastDays,
} from '@/src/utils/date';

// A fixed "now" so relative/today logic is deterministic across machines and
// time zones. Chosen mid-month so ±days never crosses a month boundary.
const FIXED_NOW = new Date('2026-06-15T12:00:00.000Z');

describe('formatDisplayDate', () => {
  it('formats a valid ISO date', () => {
    expect(formatDisplayDate('2026-06-25T00:00:00.000Z')).toBe('25 Jun 2026');
  });

  it('returns the fallback for null, undefined, empty, and unparseable input', () => {
    expect(formatDisplayDate(null)).toBe('—');
    expect(formatDisplayDate(undefined)).toBe('—');
    expect(formatDisplayDate('')).toBe('—');
    expect(formatDisplayDate('not-a-date')).toBe('—');
  });
});

describe('formatReportDate', () => {
  it('includes the weekday for a valid date', () => {
    // 2026-06-22 is a Monday.
    expect(formatReportDate('2026-06-22T00:00:00.000Z')).toBe('Mon, 22 Jun 2026');
  });

  it('returns the fallback for invalid input', () => {
    expect(formatReportDate('garbage')).toBe('—');
    expect(formatReportDate(null)).toBe('—');
  });
});

describe('formatRelativeTime', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('describes recent past times', () => {
    expect(formatRelativeTime('2026-06-15T11:59:30.000Z')).toBe('Just now');
    expect(formatRelativeTime('2026-06-15T11:00:00.000Z')).toBe('1 hour ago');
    expect(formatRelativeTime('2026-06-13T12:00:00.000Z')).toBe('2 days ago');
  });

  it('describes future times', () => {
    expect(formatRelativeTime('2026-06-15T12:00:30.000Z')).toBe('In a moment');
    expect(formatRelativeTime('2026-06-15T14:00:00.000Z')).toBe('in 2 hours');
  });

  it('falls back to an absolute date beyond a week', () => {
    expect(formatRelativeTime('2026-05-01T12:00:00.000Z')).toBe('1 May 2026');
  });

  it('returns the fallback for invalid input', () => {
    expect(formatRelativeTime('nope')).toBe('—');
  });
});

describe('getTodayISODate / isDateToday', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('reports today as the current calendar date', () => {
    const today = getTodayISODate();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(isDateToday(today)).toBe(true);
  });

  it('is false for another day and for invalid input', () => {
    expect(isDateToday('2026-06-14')).toBe(false);
    expect(isDateToday(null)).toBe(false);
  });
});

describe('isWithinLastDays', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('includes today (boundary, inclusive)', () => {
    expect(isWithinLastDays(getTodayISODate(), 7)).toBe(true);
  });

  it('includes the earliest day in the window and excludes the day before it', () => {
    // Window of 7 days ending today (the 15th) starts on the 9th.
    expect(isWithinLastDays('2026-06-09', 7)).toBe(true);
    expect(isWithinLastDays('2026-06-08', 7)).toBe(false);
  });

  it('excludes future dates and returns false for invalid input', () => {
    expect(isWithinLastDays('2026-06-16', 7)).toBe(false);
    expect(isWithinLastDays(null, 7)).toBe(false);
  });
});

describe('createDueDateFromPreset', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns null for NONE', () => {
    expect(createDueDateFromPreset('NONE')).toBeNull();
  });

  it('produces end-of-day ISO offsets relative to now', () => {
    const today = createDueDateFromPreset('TODAY');
    const inThree = createDueDateFromPreset('IN_3_DAYS');
    expect(today).not.toBeNull();
    expect(inThree).not.toBeNull();
    // Three days apart, to the millisecond.
    const dayMs = 24 * 60 * 60 * 1000;
    expect(new Date(inThree as string).getTime() - new Date(today as string).getTime()).toBe(
      3 * dayMs,
    );
  });
});

describe('calculateWorkDuration', () => {
  it('computes whole-hour and mixed durations', () => {
    expect(calculateWorkDuration('07:30', '17:30')).toBe('10h');
    expect(calculateWorkDuration('08:00', '16:45')).toBe('8h 45m');
    expect(calculateWorkDuration('08:15', '08:45')).toBe('30m');
  });

  it('handles overnight shifts by wrapping past midnight', () => {
    expect(calculateWorkDuration('22:00', '06:00')).toBe('8h');
  });

  it('treats equal start and end as zero', () => {
    expect(calculateWorkDuration('09:00', '09:00')).toBe('0h');
  });

  it('returns the fallback for malformed, empty, or out-of-range times', () => {
    expect(calculateWorkDuration('bad', '06:00')).toBe('—');
    expect(calculateWorkDuration('07:30', '')).toBe('—');
    expect(calculateWorkDuration('25:00', '06:00')).toBe('—');
    expect(calculateWorkDuration('07:60', '06:00')).toBe('—');
  });
});
