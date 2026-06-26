import {
  isValidIssue,
  isValidPhoto,
  isValidReport,
  parseStoredIssues,
  parseStoredReports,
} from '@/src/utils/validateStored';
import { makeIssue, makePhoto, makeReport, makeWorkforce } from '../fixtures';

// The validators accept `unknown`, so malformed inputs are passed directly
// without casts — keeping these tests free of `any`/`@ts-ignore`.

describe('isValidPhoto', () => {
  it('accepts a well-formed photo and one with only required fields', () => {
    expect(isValidPhoto(makePhoto())).toBe(true);
    expect(isValidPhoto({ id: 'p', uri: 'file:///p.jpg', createdAt: '2026-01-01' })).toBe(true);
  });

  it('rejects a photo missing required fields or with the wrong types', () => {
    expect(isValidPhoto({ id: 'p', createdAt: '2026-01-01' })).toBe(false); // no uri
    expect(isValidPhoto({ id: 'p', uri: 5, createdAt: '2026-01-01' })).toBe(false);
    expect(isValidPhoto(null)).toBe(false);
  });
});

describe('isValidIssue', () => {
  it('accepts a valid issue record', () => {
    expect(isValidIssue(makeIssue())).toBe(true);
  });

  it('accepts a valid draft and a null dueDate', () => {
    expect(isValidIssue(makeIssue({ status: 'DRAFT', isDraft: true, dueDate: null }))).toBe(true);
  });

  it('rejects non-objects', () => {
    expect(isValidIssue(null)).toBe(false);
    expect(isValidIssue('issue')).toBe(false);
    expect(isValidIssue([])).toBe(false);
  });

  it('rejects an unknown category or status value', () => {
    expect(isValidIssue({ ...makeIssue(), category: 'TELEPORTATION' })).toBe(false);
    expect(isValidIssue({ ...makeIssue(), status: 'ON_FIRE' })).toBe(false);
  });

  it('rejects when a required field has the wrong type', () => {
    expect(isValidIssue({ ...makeIssue(), id: 123 })).toBe(false);
    expect(isValidIssue({ ...makeIssue(), isDraft: 'no' })).toBe(false);
    expect(isValidIssue({ ...makeIssue(), dueDate: 20260625 })).toBe(false);
  });

  it('rejects an issue whose photos array contains a malformed element', () => {
    expect(isValidIssue({ ...makeIssue(), photos: [makePhoto(), { id: 'p' }] })).toBe(false);
  });
});

describe('isValidReport', () => {
  it('accepts a valid report record', () => {
    expect(isValidReport(makeReport())).toBe(true);
  });

  it('accepts a report with valid nested workforce and activities', () => {
    expect(
      isValidReport(
        makeReport({
          workforce: [makeWorkforce()],
          activities: [
            {
              id: 'act-1',
              title: 'Pour slab',
              description: 'Level 1 slab pour',
              progressPercentage: 40,
              status: 'IN_PROGRESS',
            },
          ],
        }),
      ),
    ).toBe(true);
  });

  it('rejects non-objects and unknown enum values', () => {
    expect(isValidReport(undefined)).toBe(false);
    expect(isValidReport({ ...makeReport(), weather: 'HURRICANE' })).toBe(false);
    expect(isValidReport({ ...makeReport(), shift: 'AFTERNOON' })).toBe(false);
  });

  it('rejects a report whose workforce contains a malformed entry', () => {
    expect(
      isValidReport({ ...makeReport(), workforce: [{ id: 'w', trade: 'Concrete' }] }),
    ).toBe(false);
  });

  it('rejects when a boolean flag is not a boolean', () => {
    expect(isValidReport({ ...makeReport(), accidentOccurred: 'yes' })).toBe(false);
  });
});

describe('parseStoredIssues', () => {
  it('returns an empty array for non-array / missing roots', () => {
    expect(parseStoredIssues(null)).toEqual([]);
    expect(parseStoredIssues(undefined)).toEqual([]);
    expect(parseStoredIssues({ items: [] })).toEqual([]);
  });

  it('keeps a versioned-empty collection as a valid empty collection', () => {
    expect(parseStoredIssues([])).toEqual([]);
  });

  it('drops a malformed element while preserving valid siblings', () => {
    const result = parseStoredIssues([
      makeIssue({ id: 'keep-1' }),
      { not: 'an issue' },
      makeIssue({ id: 'keep-2' }),
    ]);
    expect(result.map((i) => i.id)).toEqual(['keep-1', 'keep-2']);
  });
});

describe('parseStoredReports', () => {
  it('returns an empty array for non-array roots', () => {
    expect(parseStoredReports('corrupt')).toEqual([]);
    expect(parseStoredReports(42)).toEqual([]);
  });

  it('drops a malformed element while preserving valid siblings', () => {
    const result = parseStoredReports([
      makeReport({ id: 'keep-1' }),
      { half: 'baked' },
      makeReport({ id: 'keep-2' }),
    ]);
    expect(result.map((r) => r.id)).toEqual(['keep-1', 'keep-2']);
  });
});
