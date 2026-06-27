import type * as MonitoringModule from '@/src/services/monitoring';

// Minimal shape of the Sentry boundary we mock. Only the external SDK is
// mocked — the adapter's own behaviour is exercised for real.
type SentryMock = {
  init: jest.Mock;
  captureException: jest.Mock;
  captureMessage: jest.Mock;
  setUser: jest.Mock;
};

const DSN = 'https://public@example.invalid/1';

afterEach(() => {
  // Restore any console spies (and other mocks) installed by the fail-safe
  // tests so intentional warnings never leak between cases.
  jest.restoreAllMocks();
  jest.resetModules();
});

/**
 * Loads a fresh copy of the monitoring module with fresh Sentry and env mocks,
 * so each scenario starts from clean module state (`initialized`/`active`/dedup
 * set). `EXPO_PUBLIC_*` variables are inlined at transform time and cannot be
 * toggled at runtime, so the DSN is controlled by mocking the env module.
 */
function load(enabled: boolean): {
  Sentry: SentryMock;
  monitoring: typeof MonitoringModule;
} {
  let Sentry: SentryMock | undefined;
  let monitoring: typeof MonitoringModule | undefined;

  jest.isolateModules(() => {
    jest.doMock('@sentry/react-native', () => ({
      init: jest.fn(),
      captureException: jest.fn(),
      captureMessage: jest.fn(),
      setUser: jest.fn(),
    }));
    jest.doMock('@/src/config/env', () => ({
      getSentryDsn: () => (enabled ? DSN : ''),
      isMonitoringEnabled: () => enabled,
      getAppEnv: () => 'production',
      getMonitoringRelease: () => 'siteflow-mobile@test',
    }));
    Sentry = require('@sentry/react-native') as SentryMock;
    monitoring = require('@/src/services/monitoring') as typeof MonitoringModule;
  });

  return { Sentry: Sentry as SentryMock, monitoring: monitoring as typeof MonitoringModule };
}

describe('initializeMonitoring', () => {
  it('stays disabled and never calls Sentry.init when no DSN is configured', () => {
    const { Sentry, monitoring } = load(false);
    monitoring.initializeMonitoring();
    expect(Sentry.init).not.toHaveBeenCalled();
    expect(monitoring.isMonitoringActive()).toBe(false);
  });

  it('does not throw when configuration is missing (startup is never blocked)', () => {
    const { monitoring } = load(false);
    expect(() => monitoring.initializeMonitoring()).not.toThrow();
  });

  it('initialises once and is idempotent', () => {
    const { Sentry, monitoring } = load(true);
    monitoring.initializeMonitoring();
    monitoring.initializeMonitoring();
    monitoring.initializeMonitoring();
    expect(Sentry.init).toHaveBeenCalledTimes(1);
    expect(monitoring.isMonitoringActive()).toBe(true);
  });

  it('does not set a Sentry user identity (local demo session only)', () => {
    const { Sentry, monitoring } = load(true);
    monitoring.initializeMonitoring();
    expect(Sentry.setUser).not.toHaveBeenCalled();
  });

  it('configures privacy-safe options (no PII, replay, screenshots, or tracing)', () => {
    const { Sentry, monitoring } = load(true);
    monitoring.initializeMonitoring();
    const options = Sentry.init.mock.calls[0][0];
    expect(options.sendDefaultPii).toBe(false);
    expect(options.attachScreenshot).toBe(false);
    expect(options.attachViewHierarchy).toBe(false);
    expect(options.enableUserInteractionTracing).toBe(false);
    expect(options.tracesSampleRate).toBe(0);
    expect(options.profilesSampleRate).toBe(0);
    expect(options.replaysSessionSampleRate).toBe(0);
    expect(options.replaysOnErrorSampleRate).toBe(0);
    expect(options.debug).toBe(false);
  });

  it('stays disabled and does not crash if Sentry.init throws', () => {
    // The fail-safe path intentionally emits a dev warning; spy on it so the
    // expected warning is asserted rather than printed as test-output noise.
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { Sentry, monitoring } = load(true);
    Sentry.init.mockImplementation(() => {
      throw new Error('init boom');
    });
    expect(() => monitoring.initializeMonitoring()).not.toThrow();
    expect(monitoring.isMonitoringActive()).toBe(false);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      '[monitoring] initialisation failed; continuing without monitoring.',
    );
  });
});

describe('captureException', () => {
  it('is a safe no-op before initialisation', () => {
    const { Sentry, monitoring } = load(true);
    expect(() => monitoring.captureException(new Error('x'))).not.toThrow();
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it('is a no-op when monitoring is disabled', () => {
    const { Sentry, monitoring } = load(false);
    monitoring.initializeMonitoring();
    monitoring.captureException(new Error('x'));
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it('reports an unexpected error once (deduplicated)', () => {
    const { Sentry, monitoring } = load(true);
    monitoring.initializeMonitoring();
    const err = new Error('boom');
    // The same object reported repeatedly (e.g. through nested boundaries or
    // boundary re-renders) is sent only once.
    monitoring.captureException(err);
    monitoring.captureException(err);
    monitoring.captureException(err);
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
  });

  it('does not crash the caller if Sentry throws', () => {
    // Reporting must swallow the failure and emit a dev warning; assert that
    // warning instead of letting it pollute the test output.
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { Sentry, monitoring } = load(true);
    monitoring.initializeMonitoring();
    Sentry.captureException.mockImplementation(() => {
      throw new Error('capture boom');
    });
    expect(() => monitoring.captureException(new Error('x'))).not.toThrow();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith('[monitoring] captureException failed.');
  });

  it('redacts sensitive context before forwarding', () => {
    const { Sentry, monitoring } = load(true);
    monitoring.initializeMonitoring();
    monitoring.captureException(new Error('x'), {
      operation: 'createIssue',
      token: 'super-secret',
    });
    const [, options] = Sentry.captureException.mock.calls[0];
    expect(options.extra.operation).toBe('createIssue');
    expect(options.extra.token).toBe('[REDACTED]');
  });
});

describe('captureMessage', () => {
  it('is a no-op when disabled', () => {
    const { Sentry, monitoring } = load(false);
    monitoring.initializeMonitoring();
    monitoring.captureMessage('hello');
    expect(Sentry.captureMessage).not.toHaveBeenCalled();
  });

  it('forwards level and redacted context when active', () => {
    const { Sentry, monitoring } = load(true);
    monitoring.initializeMonitoring();
    monitoring.captureMessage('a warning', 'warning', { password: 'p', ok: 1 });
    const [message, options] = Sentry.captureMessage.mock.calls[0];
    expect(message).toBe('a warning');
    expect(options.level).toBe('warning');
    expect(options.extra.password).toBe('[REDACTED]');
    expect(options.extra.ok).toBe(1);
  });
});

describe('scrubEvent', () => {
  it('strips user identity and redacts extra and breadcrumb data', () => {
    const { monitoring } = load(true);
    const event = {
      user: { id: 'demo-user', email: 'a@b.com' },
      extra: { token: 'abc', safe: 'ok' },
      breadcrumbs: [{ category: 'navigation', data: { password: 'p', to: '/home' } }],
    };
    const out = monitoring.scrubEvent(event as never) as {
      user?: unknown;
      extra: Record<string, unknown>;
      breadcrumbs: { data: Record<string, unknown> }[];
    };
    expect(out.user).toBeUndefined();
    expect(out.extra.token).toBe('[REDACTED]');
    expect(out.extra.safe).toBe('ok');
    expect(out.breadcrumbs[0].data.password).toBe('[REDACTED]');
    expect(out.breadcrumbs[0].data.to).toBe('/home');
  });
});
