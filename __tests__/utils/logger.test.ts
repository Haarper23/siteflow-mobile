// Mock the external monitoring boundary and the env module (so the build mode
// can be controlled — `EXPO_PUBLIC_*` is inlined at transform time and cannot be
// toggled at runtime). The logger's own behaviour (suppression, redaction,
// fail-safety) is exercised for real.
jest.mock('@/src/services/monitoring', () => ({
  captureException: jest.fn(),
  captureMessage: jest.fn(),
}));
jest.mock('@/src/config/env', () => ({
  isProduction: jest.fn(),
}));

import { logger } from '@/src/utils/logger';
import { captureException, captureMessage } from '@/src/services/monitoring';
import { isProduction } from '@/src/config/env';

const mockCaptureException = captureException as jest.Mock;
const mockCaptureMessage = captureMessage as jest.Mock;
const mockIsProduction = isProduction as jest.Mock;

let debugSpy: jest.SpyInstance;
let infoSpy: jest.SpyInstance;
let warnSpy: jest.SpyInstance;
let errorSpy: jest.SpyInstance;

beforeEach(() => {
  mockCaptureException.mockReset();
  mockCaptureMessage.mockReset();
  debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
  infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
  warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  debugSpy.mockRestore();
  infoSpy.mockRestore();
  warnSpy.mockRestore();
  errorSpy.mockRestore();
});

function setEnv(env: 'development' | 'production'): void {
  mockIsProduction.mockReturnValue(env === 'production');
}

describe('development behaviour', () => {
  beforeEach(() => setEnv('development'));

  it('emits debug and info diagnostics', () => {
    logger.debug('debug message');
    logger.info('info message');
    expect(debugSpy).toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalled();
  });

  it('prints warnings and errors to the console', () => {
    logger.warn('a warning');
    logger.error('an error', new Error('boom'));
    expect(warnSpy).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
  });
});

describe('production behaviour', () => {
  beforeEach(() => setEnv('production'));

  it('suppresses debug and info output', () => {
    logger.debug('debug message');
    logger.info('info message');
    expect(debugSpy).not.toHaveBeenCalled();
    expect(infoSpy).not.toHaveBeenCalled();
    // info is purely diagnostic — it is not forwarded to monitoring.
    expect(mockCaptureMessage).not.toHaveBeenCalled();
  });

  it('does not print errors to the console but still forwards them', () => {
    logger.error('an error', new Error('boom'));
    expect(errorSpy).not.toHaveBeenCalled();
    expect(mockCaptureException).toHaveBeenCalledTimes(1);
  });

  it('does not serialise complete business records (context is bounded/redacted)', () => {
    const deep: Record<string, unknown> = {};
    let cursor = deep;
    for (let i = 0; i < 12; i += 1) {
      const next: Record<string, unknown> = {};
      cursor.child = next;
      cursor = next;
    }
    logger.error('deep', new Error('e'), deep);
    const [, context] = mockCaptureException.mock.calls[0];
    expect(JSON.stringify(context)).toContain('[Truncated]');
  });
});

describe('monitoring forwarding', () => {
  beforeEach(() => setEnv('development'));

  it('forwards warnings as warning-level messages', () => {
    logger.warn('disk slow', { operation: 'persist' });
    expect(mockCaptureMessage).toHaveBeenCalledWith(
      'disk slow',
      'warning',
      expect.objectContaining({ operation: 'persist' }),
    );
  });

  it('forwards errors as exceptions with the error object', () => {
    const err = new Error('boom');
    logger.error('failed', err, { operation: 'createIssue' });
    expect(mockCaptureException).toHaveBeenCalledWith(
      err,
      expect.objectContaining({ event: 'failed', operation: 'createIssue' }),
    );
  });

  it('forwards a message-level error when no error object is given', () => {
    logger.error('just a message');
    expect(mockCaptureException).not.toHaveBeenCalled();
    expect(mockCaptureMessage).toHaveBeenCalledWith(
      'just a message',
      'error',
      expect.objectContaining({ event: 'just a message' }),
    );
  });

  it('redacts sensitive context before forwarding', () => {
    logger.error('failed', new Error('x'), { token: 'secret-value' });
    const [, context] = mockCaptureException.mock.calls[0];
    expect(context.token).toBe('[REDACTED]');
  });
});

describe('fail-safety', () => {
  beforeEach(() => setEnv('development'));

  it('never throws even if monitoring throws', () => {
    mockCaptureException.mockImplementation(() => {
      throw new Error('monitoring down');
    });
    expect(() => logger.error('x', new Error('e'))).not.toThrow();
  });

  it('never throws on a circular context', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(() => logger.error('x', new Error('e'), circular)).not.toThrow();
  });
});
