import * as Sentry from '@sentry/react-native';
import type { Breadcrumb, ErrorEvent, SeverityLevel } from '@sentry/react-native';
import {
  getAppEnv,
  getMonitoringRelease,
  getSentryDsn,
  isMonitoringEnabled,
} from '@/src/config/env';
import { redactContext } from '@/src/utils/redactSensitiveData';

/**
 * Thin monitoring adapter over Sentry.
 *
 * The rest of the app imports *this* module (or the logger) — never
 * `@sentry/react-native` directly — so the SDK can be swapped or removed in one
 * place and so every event passes through the same privacy scrubbing.
 *
 * Design contract:
 *   - Disabled by default. Monitoring activates only when a DSN is configured
 *     (`EXPO_PUBLIC_SENTRY_DSN`). With no DSN every call here is a safe no-op,
 *     so local dev, CI, and tests never emit events.
 *   - Fail-safe. Initialisation and every capture call are wrapped so a
 *     monitoring fault can never crash the app or block startup.
 *   - Idempotent. Calling `initializeMonitoring` more than once initialises at
 *     most once.
 *   - Privacy first (see `.claude/rules/security.md`): no PII by default, no
 *     user identity (the app only has a local demo session), no session replay,
 *     no screenshots, no view-hierarchy capture, no user-interaction tracing,
 *     and performance/profiling tracing disabled. Every outgoing event and
 *     breadcrumb is scrubbed.
 */

type Context = Record<string, unknown>;

let initialized = false;
let active = false;

/**
 * Errors already reported, so the same thrown object reported through nested
 * error boundaries (or repeated boundary re-renders) is sent at most once.
 */
const reportedErrors = new WeakSet<object>();

/** Dev-only diagnostic that never routes back through the logger/monitoring. */
function devWarn(message: string): void {
  if (__DEV__) {
    console.warn(`[monitoring] ${message}`);
  }
}

/**
 * Removes anything sensitive before an event leaves the device. Exported for
 * unit testing. Never throws.
 */
export function scrubEvent(event: ErrorEvent): ErrorEvent | null {
  try {
    // The app has no real authenticated identity (local demo session only), so
    // user identity must never be attached.
    if ('user' in event) {
      delete (event as { user?: unknown }).user;
    }
    if (event.extra) {
      event.extra = redactContext(event.extra) ?? {};
    }
    if (Array.isArray(event.breadcrumbs)) {
      event.breadcrumbs = event.breadcrumbs.map((crumb) => ({
        ...crumb,
        data: crumb.data ? redactContext(crumb.data) : crumb.data,
      }));
    }
    return event;
  } catch {
    // If scrubbing itself fails, drop the event rather than risk leaking data.
    return null;
  }
}

/**
 * Drops or sanitises breadcrumbs. Console breadcrumbs can echo app logs (which
 * may reference record contents), so they are dropped entirely; everything else
 * has its data redacted.
 */
function scrubBreadcrumb(crumb: Breadcrumb): Breadcrumb | null {
  if (crumb.category === 'console') return null;
  if (crumb.data) {
    return { ...crumb, data: redactContext(crumb.data) };
  }
  return crumb;
}

/**
 * Initialises crash/error monitoring. Idempotent, fail-safe, and a no-op when
 * no DSN is configured. Safe to call at module scope during startup.
 */
export function initializeMonitoring(): void {
  if (initialized) return;
  initialized = true;

  if (!isMonitoringEnabled()) {
    // No DSN — monitoring stays dormant. This is the normal local/CI/test path.
    return;
  }

  try {
    Sentry.init({
      dsn: getSentryDsn(),
      environment: getAppEnv(),
      release: getMonitoringRelease(),
      // Never enable debug in any build — it is noisy and can print config.
      debug: false,
      // Privacy: do not collect PII, screenshots, view hierarchy, replays, or
      // user-interaction traces; keep performance/profiling tracing off.
      sendDefaultPii: false,
      attachScreenshot: false,
      attachViewHierarchy: false,
      enableCaptureFailedRequests: false,
      enableUserInteractionTracing: false,
      tracesSampleRate: 0,
      profilesSampleRate: 0,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0,
      beforeSend: scrubEvent,
      beforeBreadcrumb: scrubBreadcrumb,
    });
    active = true;
  } catch {
    // A monitoring failure must never block startup. Stay disabled.
    active = false;
    devWarn('initialisation failed; continuing without monitoring.');
  }
}

/**
 * Reports a handled or uncaught error with optional non-sensitive context.
 * Safe before initialisation and when monitoring is disabled (no-op). The same
 * error object is reported at most once.
 */
export function captureException(error: unknown, context?: Context): void {
  if (!active) return;
  try {
    if (typeof error === 'object' && error !== null) {
      if (reportedErrors.has(error)) return;
      reportedErrors.add(error);
    }
    Sentry.captureException(error, { extra: redactContext(context) });
  } catch {
    // Reporting must never throw into the caller.
    devWarn('captureException failed.');
  }
}

/**
 * Reports a message-level event (e.g. a forwarded warning) with optional
 * non-sensitive context. Safe before initialisation and when disabled.
 */
export function captureMessage(
  message: string,
  level: SeverityLevel = 'info',
  context?: Context,
): void {
  if (!active) return;
  try {
    Sentry.captureMessage(message, {
      level,
      extra: redactContext(context),
    });
  } catch {
    devWarn('captureMessage failed.');
  }
}

/** Whether monitoring is currently active (DSN configured and init succeeded). */
export function isMonitoringActive(): boolean {
  return active;
}
