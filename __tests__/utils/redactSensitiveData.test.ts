import {
  REDACTED,
  redactContext,
  redactSensitiveData,
} from '@/src/utils/redactSensitiveData';

describe('redactSensitiveData', () => {
  it('redacts known sensitive keys case-insensitively', () => {
    const input = {
      password: 'hunter2',
      AccessToken: 'abc.def',
      Authorization: 'Bearer xyz',
      RefreshToken: 'r1',
      SECRET: 's',
      apiKey: 'k',
      cookie: 'c',
      keep: 'visible',
    };

    const out = redactSensitiveData(input) as Record<string, unknown>;

    expect(out.password).toBe(REDACTED);
    expect(out.AccessToken).toBe(REDACTED);
    expect(out.Authorization).toBe(REDACTED);
    expect(out.RefreshToken).toBe(REDACTED);
    expect(out.SECRET).toBe(REDACTED);
    expect(out.apiKey).toBe(REDACTED);
    expect(out.cookie).toBe(REDACTED);
    expect(out.keep).toBe('visible');
  });

  it('removes photo URIs, local file paths, and free-text fields', () => {
    const input = {
      uri: 'file:///var/mobile/ImagePicker/abc.jpg',
      photoPath: '/data/user/0/app/cache/img.png',
      description: 'Crack found on the north retaining wall by John',
      notes: 'private note',
      email: 'worker@example.com',
      phone: '+15551234567',
      workerName: 'John Smith',
      count: 3,
    };

    const out = redactSensitiveData(input) as Record<string, unknown>;

    expect(out.uri).toBe(REDACTED);
    expect(out.photoPath).toBe(REDACTED);
    expect(out.description).toBe(REDACTED);
    expect(out.notes).toBe(REDACTED);
    expect(out.email).toBe(REDACTED);
    expect(out.phone).toBe(REDACTED);
    expect(out.workerName).toBe(REDACTED);
    // Non-sensitive scalar context survives for debugging.
    expect(out.count).toBe(3);
  });

  it('does not mutate the original object', () => {
    const input = { password: 'secret', nested: { token: 't', ok: 1 } };
    const snapshot = JSON.parse(JSON.stringify(input));

    redactSensitiveData(input);

    expect(input).toEqual(snapshot);
    expect(input.password).toBe('secret');
    expect(input.nested.token).toBe('t');
  });

  it('redacts nested sensitive keys', () => {
    const input = { outer: { inner: { password: 'p', safe: 'yes' } } };
    const out = redactSensitiveData(input) as {
      outer: { inner: { password: unknown; safe: unknown } };
    };
    expect(out.outer.inner.password).toBe(REDACTED);
    expect(out.outer.inner.safe).toBe('yes');
  });

  it('handles circular references without throwing', () => {
    const input: Record<string, unknown> = { a: 1 };
    input.self = input;

    let out: unknown;
    expect(() => {
      out = redactSensitiveData(input);
    }).not.toThrow();

    const record = out as Record<string, unknown>;
    expect(record.a).toBe(1);
    expect(record.self).toBe('[Circular]');
  });

  it('bounds deep objects instead of recursing without limit', () => {
    // Build an object deeper than the redaction depth limit.
    const deep: Record<string, unknown> = {};
    let cursor = deep;
    for (let i = 0; i < 12; i += 1) {
      const next: Record<string, unknown> = {};
      cursor.child = next;
      cursor = next;
    }

    let out: unknown;
    expect(() => {
      out = redactSensitiveData(deep);
    }).not.toThrow();

    // Somewhere down the chain the structure is truncated to a marker.
    const serialized = JSON.stringify(out);
    expect(serialized).toContain('[Truncated]');
  });

  it('truncates very long strings', () => {
    const long = 'x'.repeat(2000);
    const out = redactSensitiveData({ blob: long }) as Record<string, string>;
    expect(out.blob.length).toBeLessThan(long.length);
    expect(out.blob).toContain('[truncated]');
  });

  it('caps long arrays', () => {
    const arr = Array.from({ length: 50 }, (_, i) => i);
    const out = redactSensitiveData({ arr }) as { arr: unknown[] };
    expect(out.arr.length).toBeLessThan(arr.length);
    expect(out.arr[out.arr.length - 1]).toContain('more');
  });
});

describe('redactContext', () => {
  it('returns undefined for undefined input', () => {
    expect(redactContext(undefined)).toBeUndefined();
  });

  it('returns a redacted record copy', () => {
    const ctx = { token: 'abc', operation: 'createIssue' };
    const out = redactContext(ctx);
    expect(out).toEqual({ token: REDACTED, operation: 'createIssue' });
    // Original untouched.
    expect(ctx.token).toBe('abc');
  });
});
