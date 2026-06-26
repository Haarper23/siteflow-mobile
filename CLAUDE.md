@AGENTS.md

# SiteFlow AI — Mobile

SiteFlow AI is a **professional construction site management product**. Treat this
repository as a **production-quality product, not a tutorial or demo**. Every change
ships toward real construction teams managing real site work.

## Priorities (in order)

1. **Security**
2. **Correctness**
3. **Maintainability**
4. **Accessibility**
5. **User experience**
6. **Performance**
7. **Testability**

When two priorities conflict, the higher one wins.

## Working principles

- **Inspect existing code before editing.** Read the surrounding files, types, and
  patterns first; match the existing style.
- **Plan multi-file or architectural work** before touching code. Small one-line fixes
  do not need a plan; anything structural does.
- **Preserve working functionality.** Do not break what already works.
- **Make small, focused changes.** One concern per change.
- **Do not hide problems.** Never use `any`, `@ts-ignore`, or `@ts-expect-error` to
  silence type errors — fix the root cause.
- **Do not add dependencies without explaining why** the platform cannot already do it
  (see `.claude/rules/mobile-engineering.md`).
- **Never claim success without running the relevant checks** (lint, typecheck, tests,
  export). Evidence before assertions.
- **Never expose secrets** in code, logs, commits, or output.
- **Never modify framework/SDK versions without explicit approval** (Expo, React
  Native, React).
- **Never run destructive Git commands without explicit approval**
  (force push, `reset --hard`, history rewrites).
- **Never work directly on `main` for significant changes.** Use a branch
  (see `.claude/rules/git-workflow.md`).

## Detailed rules — read and follow

These are binding. Read the relevant file before doing related work:

- `.claude/rules/security.md` — secrets, client vs backend, validation, auth, uploads.
- `.claude/rules/mobile-engineering.md` — Expo, routing, UI, accessibility, design system.
- `.claude/rules/testing.md` — what requires tests and how to verify.
- `.claude/rules/git-workflow.md` — branches, commits, approvals.
- `.claude/rules/production-readiness.md` — what "done" actually means.

## Project commands

These are the scripts that currently exist in `package.json`:

| Command | What it does |
| --- | --- |
| `npm start` / `npx expo start` | Start the Expo dev server |
| `npm run android` | Start and open on Android |
| `npm run ios` | Start and open on iOS |
| `npm run web` | Start and open on web |
| `npm run lint` | Lint via `expo lint` |
| `npm run reset-project` | Reset to a blank app (scaffolding helper) |

There is **no `test` script configured yet**. Do not invent scripts that are not
present in `package.json`.

### Verification checks (run when relevant)

```bash
npx expo-doctor             # project/dependency health
npx tsc --noEmit            # TypeScript typecheck
npm run lint                # ESLint via expo lint
npx expo export --platform web   # confirm the bundle builds
```

Run `npm test` only once a test runner is actually configured.

## Stack snapshot

- **Expo SDK 54**, **Expo Router 6**, **React Native 0.81**, **React 19**.
- New Architecture + React Compiler enabled (`app.json`).
- Source lives under `src/` (`components`, `context`, `data`, `theme`, `types`,
  `utils`); routes live under `app/` using Expo Router.
- Before writing any Expo code, read the versioned docs at
  https://docs.expo.dev/versions/v54.0.0/ (see `AGENTS.md`).
