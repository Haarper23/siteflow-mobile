import {
  getAppEnv,
  getAppVersion,
  getMonitoringRelease,
  getSentryDsn,
  isMonitoringEnabled,
  parseAppEnv,
} from '@/src/config/env';

// Note: `EXPO_PUBLIC_*` variables are inlined by babel-preset-expo at transform
// time, so they cannot be toggled at runtime in tests. The pure `parseAppEnv`
// is tested exhaustively below; the inlined readers are tested for their default
// (unset) behaviour, which is what the test bundle is built with.

describe('parseAppEnv', () => {
  it.each(['development', 'preview', 'production'] as const)(
    'accepts the supported value "%s"',
    (value) => {
      expect(parseAppEnv(value, false)).toBe(value);
    },
  );

  it('trims surrounding whitespace', () => {
    expect(parseAppEnv('  production  ', false)).toBe('production');
  });

  it('falls back to development in dev builds when unset', () => {
    expect(parseAppEnv(undefined, true)).toBe('development');
    expect(parseAppEnv('', true)).toBe('development');
  });

  it('falls back to production in release builds when unset', () => {
    expect(parseAppEnv(undefined, false)).toBe('production');
  });

  it('falls back safely (no throw) on an invalid value', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() => parseAppEnv('staging-typo', true)).not.toThrow();
    expect(parseAppEnv('staging-typo', true)).toBe('development');
    expect(parseAppEnv('staging-typo', false)).toBe('production');
    warnSpy.mockRestore();
  });

  it('raises only a dev-only diagnostic and never prints the raw value', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    parseAppEnv('bogus', false); // release build: silent
    expect(warnSpy).not.toHaveBeenCalled();

    parseAppEnv('bogus', true); // dev build: one formatted string, no value args
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0].length).toBe(1);
    expect(warnSpy.mock.calls[0][0]).not.toContain('bogus');

    warnSpy.mockRestore();
  });
});

describe('default (unset) runtime configuration', () => {
  it('resolves a valid app environment', () => {
    expect(['development', 'preview', 'production']).toContain(getAppEnv());
  });

  it('keeps monitoring disabled when no DSN is bundled', () => {
    expect(getSentryDsn()).toBe('');
    expect(isMonitoringEnabled()).toBe(false);
  });
});

describe('version metadata', () => {
  it('returns a non-empty app version string', () => {
    expect(typeof getAppVersion()).toBe('string');
    expect(getAppVersion().length).toBeGreaterThan(0);
  });

  it('builds a release identifier containing the version', () => {
    expect(getMonitoringRelease()).toContain('@');
    expect(getMonitoringRelease()).toContain(getAppVersion());
  });
});
