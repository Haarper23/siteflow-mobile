# Git Workflow Rules

How to use Git on SiteFlow AI. Approval here means **explicit user approval**.

## Branches

- **Significant work must happen on a branch**, never directly on `main`. Use a typed
  prefix that matches the work:
  - `feature/...` — new functionality
  - `fix/...` — bug fixes
  - `security/...` — security hardening
  - `refactor/...` — restructuring without behavior change
  - `test/...` — adding or improving tests
  - `chore/...` — config, tooling, docs, maintenance
- Trivial, isolated edits may be committed directly only when the user has said so.

## Before committing

- **Inspect `git status` and `git diff` before committing.** Know exactly what is staged
  and why. Do not blind-commit `-A`.
- **Run the relevant checks before committing** (lint, typecheck, tests, export — see
  `testing.md`). Do not commit code you have not verified.

## What must never be committed

- `.env` files, credentials, private keys, certificates, or any secret.
- Build artifacts (`dist/`, `web-build/`, native build output).
- Local editor / OS files (`.DS_Store`, local IDE settings not meant to be shared).

If `.gitignore` is missing an entry for one of these, add it (see `.gitignore`).

## Commits

- **Keep commits focused** — one logical change per commit.
- **Use descriptive commit messages** that explain the *what* and *why*.

## Destructive and remote operations — require approval

These need **explicit approval** every time; never do them automatically:

- **Never force push** (`git push --force` / `--force-with-lease`) without approval.
- **Never `git reset --hard`** without approval.
- **Never rewrite Git history** (rebase that rewrites shared history, amend of pushed
  commits, filter-branch, etc.) without approval.
- **Do not automatically push after making changes.** Committing locally is fine when
  asked; pushing is a separate, explicit step.
- **Ask for approval before push, merge, rebase, or any history modification.**
