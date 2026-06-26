# 001 — Fix Critical Security Findings Implementation Plan

> **For agentic workers:** Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement task-by-task. Steps use `- [ ]` for tracking. **Do not execute this plan without explicit user approval** (it changes auth/login behavior — see root `CLAUDE.md` and `.claude/rules/git-workflow.md`).

**Goal:** Remove hardcoded demo credentials from the bundle and add a real client-side auth gate (session + route guard + SecureStore) so the `(app)` area cannot be reached unauthenticated.

**Architecture:** Introduce a lightweight `AuthContext` that holds an in-memory session and persists a session token via `expo-secure-store`. `app/(app)/_layout.tsx` becomes a guard that redirects to `/login` when there is no session. The demo login becomes a configurable, clearly-non-production path instead of two hardcoded constants rendered on screen.

**Tech Stack:** Expo SDK 54, Expo Router 6, React 19, `expo-secure-store` (Expo-maintained, SDK-aligned — justified because tokens must NOT live in AsyncStorage per `.claude/rules/security.md`).

## Global Constraints

- Expo SDK 54; add native deps **only** via `npx expo install` (never raw `npm install` for native packages). — `.claude/rules/mobile-engineering.md`
- No secrets in source, `app.json`, `EXPO_PUBLIC_*`, or Git. — `.claude/rules/security.md`
- Tokens use `expo-secure-store`, never AsyncStorage. — `.claude/rules/security.md`
- No `any`/`@ts-ignore`/`@ts-expect-error`. — root `CLAUDE.md`
- Never include route-group names in public navigation targets. — `.claude/rules/mobile-engineering.md`
- Work on a branch (`security/...`); do not commit/push without explicit approval. — `.claude/rules/git-workflow.md`

## Confirmed Findings Addressed

- **C1** — No real auth/authz; `(app)` routes reachable without login (deep-link bypass).
- **C2** — Hardcoded demo credentials shipped and displayed in the bundle.
- Sets up the SecureStore foundation referenced by §22 of the audit.

## Files Affected

- Create: `src/context/AuthContext.tsx` — session state + SecureStore-backed token.
- Create: `src/utils/secureSession.ts` — thin SecureStore wrapper (get/set/clear token).
- Modify: `app/_layout.tsx` — mount `AuthProvider` above the navigator.
- Modify: `app/(app)/_layout.tsx` — add the redirect guard.
- Modify: `app/(auth)/login.tsx` — call `signIn`; remove hardcoded constants + on-screen demo card (or gate behind a dev-only flag).
- Modify: `app/(app)/(tabs)/profile.tsx` — wire "Sign Out" to `signOut()`.
- Modify: `.env.example` — document optional `EXPO_PUBLIC_DEMO_LOGIN` flag (non-secret).
- Test: `src/utils/__tests__/secureSession.test.ts` (requires the runner from `plans/004`; if 004 not yet done, defer the test step and verify manually).

## Interfaces

- `secureSession.ts` **produces:** `getSessionToken(): Promise<string | null>`, `setSessionToken(token: string): Promise<void>`, `clearSessionToken(): Promise<void>`.
- `AuthContext.tsx` **produces:** `useAuth(): { isAuthenticated: boolean; isRestoring: boolean; signIn(email: string, password: string): Promise<{ ok: true } | { ok: false; message: string }>; signOut(): Promise<void> }`.
- `(app)/_layout.tsx` **consumes:** `useAuth()` (`isAuthenticated`, `isRestoring`).
- `login.tsx` **consumes:** `useAuth().signIn`.

---

### Task 1: SecureStore session wrapper

**Files:**
- Create: `src/utils/secureSession.ts`
- Test: `src/utils/__tests__/secureSession.test.ts` (defer if `plans/004` not yet executed)

- [ ] **Step 1: Install the native dependency (Expo-resolved)**

Run: `npx expo install expo-secure-store`
Expected: `expo-secure-store` added at the SDK-54-compatible version; `expo-doctor` still green.

- [ ] **Step 2: Implement the wrapper**

```ts
// src/utils/secureSession.ts
import * as SecureStore from 'expo-secure-store';

const SESSION_TOKEN_KEY = 'siteflow_ai_session_token_v1';

/** Reads the persisted session token, or null if none / on failure. */
export async function getSessionToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(SESSION_TOKEN_KEY);
  } catch {
    return null;
  }
}

/** Persists the session token in the platform secure store. */
export async function setSessionToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(SESSION_TOKEN_KEY, token);
}

/** Removes the session token. Safe to call when none exists. */
export async function clearSessionToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
  } catch {
    // Nothing actionable if deletion fails.
  }
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/utils/secureSession.ts package.json package-lock.json
git commit -m "feat(auth): add SecureStore-backed session token helper"
```

---

### Task 2: Auth context

**Files:**
- Create: `src/context/AuthContext.tsx`
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Implement the provider**

```tsx
// src/context/AuthContext.tsx
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getSessionToken, setSessionToken, clearSessionToken } from '@/src/utils/secureSession';

type SignInResult = { ok: true } | { ok: false; message: string };

interface AuthContextValue {
  isAuthenticated: boolean;
  isRestoring: boolean;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Demo-only credentials, sourced from non-secret public config and disabled
// unless explicitly enabled. NOT a production auth path. Replace with a real
// backend call when one exists.
const DEMO_LOGIN_ENABLED = process.env.EXPO_PUBLIC_DEMO_LOGIN === 'true';
const DEMO_EMAIL = 'demo@siteflow.ai';
const DEMO_PASSWORD = 'Demo123!';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);

  useEffect(() => {
    void (async () => {
      setToken(await getSessionToken());
      setIsRestoring(false);
    })();
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<SignInResult> => {
    // TODO(backend): replace with an authenticated API call returning a real token.
    if (DEMO_LOGIN_ENABLED && email.trim() === DEMO_EMAIL && password === DEMO_PASSWORD) {
      const issued = `demo-${Date.now()}`;
      await setSessionToken(issued);
      setToken(issued);
      return { ok: true };
    }
    return { ok: false, message: 'Invalid email or password' };
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    await clearSessionToken();
    setToken(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ isAuthenticated: token !== null, isRestoring, signIn, signOut }),
    [token, isRestoring, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
```

- [ ] **Step 2: Mount the provider at the root**

In `app/_layout.tsx`, wrap the existing `<Stack>` with `<AuthProvider>` (keep `SafeAreaProvider` outermost). Import from `@/src/context/AuthContext`.

```tsx
<SafeAreaProvider>
  <AuthProvider>
    <StatusBar style="light" />
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background }, animation: 'fade' }} />
  </AuthProvider>
</SafeAreaProvider>
```

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/context/AuthContext.tsx app/_layout.tsx
git commit -m "feat(auth): add AuthProvider with restore and demo sign-in"
```

---

### Task 3: Route guard on the authed area

**Files:**
- Modify: `app/(app)/_layout.tsx`

- [ ] **Step 1: Add the redirect guard**

Add `useAuth` + `Redirect` while preserving the existing provider nesting and `Stack` config:

```tsx
import { Redirect, Stack } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '@/src/context/AuthContext';
import { IssueProvider } from '@/src/context/IssueContext';
import { DailyReportProvider } from '@/src/context/DailyReportContext';
import { colors } from '@/src/theme/colors';

export default function AppLayout() {
  const { isAuthenticated, isRestoring } = useAuth();

  if (isRestoring) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return (
    <IssueProvider>
      <DailyReportProvider>
        {/* existing <Stack> ... (unchanged) */}
      </DailyReportProvider>
    </IssueProvider>
  );
}
```

(Keep the existing `<Stack.Screen ...>` declarations verbatim.)

- [ ] **Step 2: Verify the guard manually**

Run: `npx expo start --web`, then navigate directly to `/home` with no session.
Expected: redirected to `/login` (not the home screen).

- [ ] **Step 3: Typecheck + export**

Run: `npx tsc --noEmit && npx expo export --platform web`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/_layout.tsx"
git commit -m "feat(auth): guard (app) routes behind authenticated session"
```

---

### Task 4: Login uses signIn; remove hardcoded credentials

**Files:**
- Modify: `app/(auth)/login.tsx`

- [ ] **Step 1: Replace the credential check and after-login navigation**

- Delete the module constants `DEMO_EMAIL`/`DEMO_PASSWORD` (lines ~19-20).
- Replace the body of `handleLogin`'s success path:

```tsx
const { signIn } = useAuth(); // add near other hooks

// inside handleLogin, after validation:
setLoading(true);
const result = await signIn(email, password);
if (result.ok) {
  router.replace('/home');
} else {
  setLoading(false);
  setGeneralError(result.message);
}
```

- [ ] **Step 2: Replace the on-screen demo card with a dev-only hint**

Remove the always-on demo card (lines ~186-200). If a demo hint is still desired, render it only when `process.env.EXPO_PUBLIC_DEMO_LOGIN === 'true'`, and show only the email (never the password).

- [ ] **Step 3: Document the optional flag**

Add to `.env.example`:

```
# Optional: enable the non-production demo login path (never set in production)
EXPO_PUBLIC_DEMO_LOGIN=false
```

- [ ] **Step 4: Confirm no credentials remain**

Run: `grep -rn "Demo123" app src` and `grep -rn "DEMO_PASSWORD" app src`
Expected: no matches.

- [ ] **Step 5: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add "app/(auth)/login.tsx" .env.example
git commit -m "security(auth): remove hardcoded demo credentials; use signIn"
```

---

### Task 5: Wire Sign Out to the auth context

**Files:**
- Modify: `app/(app)/(tabs)/profile.tsx`

- [ ] **Step 1: Call signOut in the logout confirm handler**

Replace the inline `router.replace('/login')` in `handleLogout`'s confirm action with a call that awaits `signOut()` then navigates. Convert `handleLogout` to read `signOut` from `useAuth()` inside the component (move it into the component body or pass `signOut` in).

```tsx
const { signOut } = useAuth();
// ...
onPress: () => {
  void signOut().then(() => router.replace('/login'));
},
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS.

- [ ] **Step 3: Manual check**

Sign out → confirm redirect to `/login`; relaunch app → stays on `/login` (token cleared from SecureStore).

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/(tabs)/profile.tsx"
git commit -m "feat(auth): clear secure session on sign out"
```

---

## Security Considerations

- Token lives only in `expo-secure-store`; never in AsyncStorage, logs, or Git.
- Demo path is **off by default** and gated by a non-secret public flag; the password is no longer rendered.
- This is still a **client-only** gate; it does NOT replace backend authn/authz (role + resource ownership, rate limiting) — those remain backend tasks (audit §8).

## Testing Requirements

- `src/utils/secureSession.ts`: get returns null when empty, round-trips set→get, clear removes (mock `expo-secure-store`). Requires runner from `plans/004`.
- Auth context: `signIn` rejects bad creds, accepts demo creds only when flag enabled, restore reads persisted token, `signOut` clears.
- Manual: deep-link `/home` unauthenticated → redirect; sign out persists across relaunch.

## Acceptance Criteria

- No hardcoded password string remains in `app/`/`src/` (`grep` clean).
- Unauthenticated navigation to any `(app)` route redirects to `/login`.
- Session persists across relaunch via SecureStore; sign out clears it.
- `tsc`, `lint`, `expo export`, `expo-doctor` all green.

## Verification Commands

```bash
npx expo install expo-secure-store   # Task 1 only
npx tsc --noEmit
npm run lint
npx expo-doctor@latest
npx expo export --platform web
grep -rn "Demo123" app src           # expect no matches
```

## Rollback Considerations

- Pure additive + localized edits; revert the commits to restore prior behavior.
- If the guard misbehaves, temporarily returning `true` for `isAuthenticated` restores access without reverting files (do not ship that).
- `expo-secure-store` can be removed with `npm uninstall` + revert if the approach is abandoned.

## Dependencies

- Adds `expo-secure-store`.
- Test steps depend on `plans/004` (runner). If 004 is not yet done, perform the manual verifications and defer the unit-test steps.

## Estimated Implementation Risk: **Medium**
(Touches auth/login/navigation behavior; requires explicit approval. Logic is small and localized, but it changes a user-facing gate.)
