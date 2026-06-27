import { isProduction } from '@/src/config/env';
import {
  captureException,
  captureMessage,
} from '@/src/services/monitoring';
import { redactContext } from '@/src/utils/redactSensitiveData';

/**
 * Small structured-logging abstraction for SiteFlow AI.
 *
 * Production code should call this instead of `console.*` directly. It gives
 * useful diagnostics in development while staying quiet and safe in production:
 *
 *   - `debug` / `info` — development diagnostics only; suppressed in production.
 *   - `warn` — development console + forwarded to monitoring as a message.
 *   - `error` — development console + forwarded to monitoring as an exception.
 *
 * SECURITY (see `.claude/rules/security.md`):
 *   - Context is always passed through {@link redactContext}, so tokens,
 *     authorization headers, passwords, sessions, free-text report/issue bodies,
 *     worker/customer identity, and local file/photo paths are stripped before
 *     anything is printed or sent.
 *   - Callers must pass small, allowlisted context (record type, operation name,
 *     counts) — never whole business records. The redaction layer is a backstop.
 *   - Logging never throws: a logger fault must not crash the app.
 *   - Nothing here serialises entire objects automatically; depth and size are
 *     bounded by the redaction layer.
 */

export type LogContext = Record<string, unknown>;

/** True when verbose (debug/info) console output is allowed. */
function verbose(): boolean {
  return !isProduction();
}

function safeRedact(context?: LogContext): LogContext | undefined {
  try {
    return redactContext(context);
  } catch {
    return undefined;
  }
}

/** Forwards to monitoring without ever throwing into the caller. */
function safeForward(forward: () => void): void {
  try {
    forward();
  } catch {
    // A monitoring fault must never affect the caller (e.g. boundary rendering).
  }
}

export const logger = {
  /** Development-only fine-grained diagnostics. No-op in production. */
  debug(message: string, context?: LogContext): void {
    try {
      if (!verbose()) return;
      console.debug(`[debug] ${message}`, safeRedact(context) ?? '');
    } catch {
      // Logging must never crash the caller.
    }
  },

  /** Development-only informational logs. No-op in production. */
  info(message: string, context?: LogContext): void {
    try {
      if (!verbose()) return;
      console.info(`[info] ${message}`, safeRedact(context) ?? '');
    } catch {
      /* never throw */
    }
  },

  /**
   * A recoverable problem. Printed in development and forwarded to monitoring
   * (when enabled) as a warning-level message.
   */
  warn(message: string, context?: LogContext): void {
    const redacted = safeRedact(context);
    try {
      if (verbose()) {
        console.warn(`[warn] ${message}`, redacted ?? '');
      }
    } catch {
      /* never throw */
    }
    safeForward(() => captureMessage(message, 'warning', redacted));
  },

  /**
   * An error. Printed in development (generic message + redacted context, never
   * a raw stack to a user) and forwarded to monitoring (when enabled). When an
   * `error` object is supplied it is reported as an exception; otherwise the
   * message is reported at error level.
   */
  error(message: string, error?: unknown, context?: LogContext): void {
    const redacted = safeRedact({ event: message, ...(context ?? {}) });
    try {
      if (verbose()) {
        console.error(`[error] ${message}`, error ?? '', safeRedact(context) ?? '');
      }
    } catch {
      /* never throw */
    }
    if (error !== undefined) {
      safeForward(() => captureException(error, redacted));
    } else {
      safeForward(() => captureMessage(message, 'error', redacted));
    }
  },
};
