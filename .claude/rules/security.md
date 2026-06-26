# Security Rules

Binding security requirements for SiteFlow AI. These apply now (mobile) and to the
future backend. When a rule is backend-only, it is marked **[Backend]**.

## The fundamental boundary: clients are public

- **Mobile and browser code are public clients.** Anything shipped in the app bundle —
  JavaScript, config, `app.json`, EXPO_PUBLIC variables — can be read by any user who
  downloads the app. Treat all of it as published to the world.
- **Private API keys must never exist in frontend code.** Not in source, not in
  constants, not in `app.json`, not in committed `.env` files.
- **`EXPO_PUBLIC_*` variables are visible to users.** They are embedded in the bundle at
  build time. They may hold non-secret config (public URLs, feature flags) but
  **must never contain secrets** of any kind.

## Where secrets are allowed to live

- **AI provider keys** (Anthropic, OpenAI, etc.) exist **only on the backend**. The
  mobile app calls your own backend, which holds the key and calls the provider.
- **Database credentials and JWT signing secrets exist only on the backend.** **[Backend]**
- The mobile app holds **no** AI, database, or JWT signing secret — ever.

## Logging and data handling

- **Never log tokens, passwords, authorization headers, or private user data.** This
  includes `console.log`, crash reports, and analytics events.
- **AsyncStorage is for non-sensitive values only** (UI preferences, cached
  non-secret data). It is unencrypted.
- **Authentication tokens must use Expo SecureStore** (`expo-secure-store`) once
  authentication is implemented — never AsyncStorage for tokens.

## Validation and authorization

- **Client-side validation is UX only.** It gives fast feedback; it is not a security
  control and can be bypassed.
- **Backend validation is mandatory.** Every request is validated server-side regardless
  of what the client checked. **[Backend]**
- **Authorization must check both role and resource ownership.** "Is this user an
  authenticated foreman?" is not enough — also verify "does this user own / have access
  to *this specific* project / issue / report?" **[Backend]**

## File uploads

- **Validate uploaded files by size, MIME type, and — where practical — actual content**
  (magic bytes), not just the file extension. **[Backend]**
- **Rename uploaded files using generated IDs** (e.g. UUIDs). Never trust or reuse the
  client-supplied filename for storage paths. **[Backend]**
- On mobile, handle image-picker permission denial and cancellation safely (see
  `mobile-engineering.md`).

## Errors, rate limiting, and AI

- **Production errors must not expose stack traces or infrastructure details** to the
  client. Return safe, generic messages; log details server-side. **[Backend]**
- **Login, form, upload, and AI endpoints must use rate limiting.** **[Backend]**
- **AI requests require token limits, budgets, timeouts, and safe output validation.**
  Treat AI output as untrusted input: validate/sanitize before storing or rendering, and
  enforce per-user budgets. **[Backend]**

## Network and data access

- **Production CORS must use an explicit allowlist** of known origins — never `*` in
  production. **[Backend]**
- **SQL must use an ORM or parameterized queries.** Never build SQL by string
  concatenation of user input. **[Backend]**

## Source control

- **No secrets may be committed to Git** — no keys, tokens, credentials, or `.env` files
  with real values. Use `.env.example` with placeholders only. See `git-workflow.md`.

## Mobile vs. backend responsibilities

- **Mobile (now):** keep secrets out of the bundle and EXPO_PUBLIC vars; use SecureStore
  for tokens; treat client validation as UX only; handle permissions safely; never log
  sensitive data.
- **Backend (future):** mandatory server-side validation, authentication and
  authorization (role + ownership), rate limiting, safe error handling, upload
  validation, CORS allowlist, parameterized SQL, AI budgets/timeouts, and custody of all
  secrets.
