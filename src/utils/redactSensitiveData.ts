/**
 * Narrowly-scoped redaction for values that may be attached to a log line or a
 * monitoring event.
 *
 * SECURITY: this is a *defence-in-depth* layer, not the primary control. The
 * primary control is that callers attach only allowlisted, non-sensitive
 * context (record type, operation name, counts) — never whole `Issue`,
 * `DailyReport`, `User`, `Session`, or `Photo` objects (see
 * `.claude/rules/security.md`). This function ensures that if a sensitive key
 * does slip through, its value is replaced before it can leave the device.
 *
 * Guarantees:
 *   - Never mutates the input (returns a redacted copy).
 *   - Matches sensitive keys case-insensitively.
 *   - Bounded recursion depth and array/string length (no runaway serialisation).
 *   - Safe on circular references (replaced with `[Circular]`).
 *   - Never throws.
 */

/** Replacement token written in place of a redacted value. */
export const REDACTED = '[REDACTED]';

const MAX_DEPTH = 4;
const MAX_ARRAY_ITEMS = 20;
const MAX_STRING_LENGTH = 512;

/**
 * Substrings that mark a key whose *value* must never be recorded. Matched
 * case-insensitively against the key name. Kept intentionally broad for the
 * sensitive data this product handles: credentials, sessions, free-text report
 * bodies, worker/customer identity, and local file/photo locations.
 */
const SENSITIVE_KEY_PATTERNS: readonly string[] = [
  'password',
  'passcode',
  'token', // also matches accessToken / refreshToken
  'authorization',
  'auth',
  'cookie',
  'secret',
  'apikey',
  'privatekey',
  'session',
  'credential', // also matches credentials
  'email',
  'phone',
  'address',
  // local file paths and picked-photo URIs
  'uri',
  'url',
  'path',
  'file',
  // construction free-text and identity
  'description',
  'notes',
  'comment',
  'workername',
  'worker',
  'customer',
  'company',
];

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  return SENSITIVE_KEY_PATTERNS.some((pattern) => lower.includes(pattern));
}

function redactString(value: string): string {
  return value.length > MAX_STRING_LENGTH
    ? `${value.slice(0, MAX_STRING_LENGTH)}…[truncated]`
    : value;
}

function redactValue(
  value: unknown,
  depth: number,
  seen: WeakSet<object>,
): unknown {
  if (value === null || value === undefined) return value;

  const type = typeof value;
  if (type === 'string') return redactString(value as string);
  if (type === 'number' || type === 'boolean') return value;
  if (type === 'bigint') return (value as bigint).toString();
  if (type === 'function' || type === 'symbol') return `[${type}]`;

  // Objects and arrays from here down.
  if (depth >= MAX_DEPTH) return '[Truncated]';

  if (value instanceof Date) return value.toISOString();

  const obj = value as object;
  if (seen.has(obj)) return '[Circular]';
  seen.add(obj);

  if (Array.isArray(value)) {
    const items = value
      .slice(0, MAX_ARRAY_ITEMS)
      .map((item) => redactValue(item, depth + 1, seen));
    if (value.length > MAX_ARRAY_ITEMS) {
      items.push(`…(${value.length - MAX_ARRAY_ITEMS} more)`);
    }
    return items;
  }

  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    out[key] = isSensitiveKey(key)
      ? REDACTED
      : redactValue(entry, depth + 1, seen);
  }
  return out;
}

/**
 * Returns a redacted, bounded, non-circular copy of `value` safe to attach to a
 * log line or monitoring event. The original is never mutated. Never throws —
 * on any unexpected failure it returns a safe marker instead of the input.
 */
export function redactSensitiveData(value: unknown): unknown {
  try {
    return redactValue(value, 0, new WeakSet<object>());
  } catch {
    return '[Unserialisable]';
  }
}

/**
 * Convenience wrapper for the `Record<string, string>` context shape used by
 * the logger and monitoring adapter. Returns a new, redacted record; the input
 * is never mutated.
 */
export function redactContext(
  context: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (context === undefined) return undefined;
  const redacted = redactSensitiveData(context);
  // `redactValue` always returns an object for an object input, but guard anyway.
  return typeof redacted === 'object' && redacted !== null
    ? (redacted as Record<string, unknown>)
    : undefined;
}
