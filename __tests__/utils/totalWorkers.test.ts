import { totalWorkers } from '@/src/types/dailyReport';
import { makeWorkforce } from '../fixtures';

describe('totalWorkers', () => {
  it('sums worker counts across entries', () => {
    const workforce = [
      makeWorkforce({ id: 'a', workerCount: 6 }),
      makeWorkforce({ id: 'b', workerCount: 4 }),
      makeWorkforce({ id: 'c', workerCount: 10 }),
    ];
    expect(totalWorkers(workforce)).toBe(20);
  });

  it('returns 0 for an empty workforce', () => {
    expect(totalWorkers([])).toBe(0);
  });

  it('treats a missing/zero count as 0 rather than NaN', () => {
    // Guards the `entry.workerCount || 0` fallback against a malformed entry.
    const workforce = [
      makeWorkforce({ id: 'a', workerCount: 5 }),
      makeWorkforce({ id: 'b', workerCount: 0 }),
    ];
    expect(totalWorkers(workforce)).toBe(5);
  });
});
