import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Centralised, safe access to the app's public runtime configuration.
 *
 * SECURITY: every value here comes from `EXPO_PUBLIC_*` variables or the app
 * manifest, all of which are embedded in the client bundle and therefore are
 * NOT secrets (see `.claude/rules/security.md`). No private key, token, or
 * credential is ever read or exposed here. The functions below never log their
 * values — environment variables must not be printed.
 *
 * Values are read on each call (rather than captured at module load) so tests
 * and tooling can vary them without re-importing the module, and so a late-set
 * variable is always reflected.
 */

/** The deployment environments the app distinguishes between. */
export type AppEnv = 'development' | 'preview' | 'production';

const APP_ENVS: readonly AppEnv[] = ['development', 'preview', 'production'];

function isAppEnv(value: string): value is AppEnv {
  return (APP_ENVS as readonly string[]).includes(value);
}

/**
 * Pure resolution of an app environment from a raw value and the build mode.
 * Exported for testing — `getAppEnv` is the thin wrapper that supplies the
 * actual (build-time-inlined) `EXPO_PUBLIC_APP_ENV` value.
 *
 * Precedence:
 *   1. A valid raw value (`development` | `preview` | `production`).
 *   2. A safe fallback derived from the build mode — `development` in dev, and
 *      `production` for any release build.
 *
 * An *invalid* value never throws: it falls back to the build-mode default and
 * raises a development-only diagnostic so the misconfiguration is visible while
 * building, without crashing a release app. The diagnostic is a single
 * formatted string — no other env values are ever printed.
 */
export function parseAppEnv(
  raw: string | undefined,
  isDev: boolean,
): AppEnv {
  const value = (raw ?? '').trim();
  const fallback: AppEnv = isDev ? 'development' : 'production';

  if (value === '') return fallback;
  if (isAppEnv(value)) return value;

  if (isDev) {
    console.warn(
      `[config] Unrecognised EXPO_PUBLIC_APP_ENV; falling back to "${fallback}".`,
    );
  }
  return fallback;
}

/**
 * Resolves the current app environment from the build-time `EXPO_PUBLIC_APP_ENV`
 * value (or a safe build-mode fallback). See {@link parseAppEnv}.
 */
export function getAppEnv(): AppEnv {
  return parseAppEnv(process.env.EXPO_PUBLIC_APP_ENV, __DEV__);
}

/** True only in a production build/environment. */
export function isProduction(): boolean {
  return getAppEnv() === 'production';
}

/** True in development — used to gate verbose diagnostics. */
export function isDevelopment(): boolean {
  return getAppEnv() === 'development';
}

/**
 * The Sentry DSN, or an empty string when monitoring is disabled.
 *
 * The DSN is a *publishable* client key — safe to ship in the bundle — so it
 * lives in `EXPO_PUBLIC_SENTRY_DSN`. An empty value (the default) keeps
 * monitoring fully disabled, which is the correct local/CI/test behaviour.
 */
export function getSentryDsn(): string {
  return (process.env.EXPO_PUBLIC_SENTRY_DSN ?? '').trim();
}

/** Whether crash/error monitoring should be active (a DSN is configured). */
export function isMonitoringEnabled(): boolean {
  return getSentryDsn() !== '';
}

/**
 * The user-facing app version (e.g. `1.0.0`) from the manifest, or `unknown`
 * if it cannot be read. Used as safe, non-PII monitoring metadata.
 */
export function getAppVersion(): string {
  const version = Constants.expoConfig?.version;
  return typeof version === 'string' && version !== '' ? version : 'unknown';
}

/**
 * A monitoring "release" identifier combining the slug and version, e.g.
 * `siteflow-mobile@1.0.0`. Contains no user or device data.
 */
export function getMonitoringRelease(): string {
  const slug = Constants.expoConfig?.slug ?? 'siteflow-mobile';
  return `${slug}@${getAppVersion()}`;
}

/** The current platform (`ios` | `android` | `web`) — safe monitoring tag. */
export function getPlatform(): string {
  return Platform.OS;
}
