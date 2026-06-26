# GitHub Repository Hardening — Manual Steps

This project commits its CI and dependency automation as code (see the files under
`.github/`). However, **several GitHub security controls live only in repository
settings and cannot be committed as files.** This document lists those manual steps
for the repository owner to apply **after the workflows have been merged to `main`
and have run at least once** (so the check names exist and can be required).

> **Verification note:** Nothing in this document asserts that a given remote setting
> is *currently* enabled. These are instructions to enable, not a status report. No
> repository setting was changed while writing this — only read-only inspection of the
> committed files and the Git remote was performed.

## Legend

- 🟢 **Configured by committed files** — already in the repo; no UI action needed.
- 🟠 **Manual GitHub UI / API action required** — must be set by an admin.
- 🔵 **May depend on repository visibility or GitHub plan** — availability varies
  (public vs private, Free vs GitHub Advanced Security).

---

## 1. Already configured by committed files 🟢

| Control | File |
| --- | --- |
| PR/push CI (typecheck, lint, test+coverage, Expo Doctor, web export, high/critical audit) | `.github/workflows/mobile-ci.yml` |
| PR dependency-diff review (`fail-on-severity: high`) | `.github/workflows/dependency-review.yml` |
| CodeQL JS/TS code scanning (PR, push, weekly, manual) | `.github/workflows/codeql.yml` |
| Dependabot version updates (npm + GitHub Actions, weekly) | `.github/dependabot.yml` |
| PR checklist | `.github/pull_request_template.md` |
| Vulnerability reporting policy | `SECURITY.md` |

Actions in the workflows are pinned to immutable commit SHAs (supply-chain hardening).

---

## 2. Actions permissions 🟠

**Settings → Actions → General:**

- **Workflow permissions:** set the default `GITHUB_TOKEN` to **Read repository
  contents permission** (read-only). The committed workflows already request only the
  scopes they need, so a read-only default is safe.
- **Prevent Actions from creating or approving pull requests:** **enabled.** (Dependabot
  opens its PRs through its own path and does not need this.)
- **Actions allowlist (🔵 practical where supported):** under **Allow <owner> and select
  non-<owner> actions**, prefer **Allow actions created by GitHub** plus the specific
  third-party actions this repo pins (`actions/*`, `github/codeql-action`). This blocks
  arbitrary third-party actions. A verified-creator policy is an acceptable alternative.

---

## 3. Branch protection / ruleset for `main` 🟠

**Settings → Branches → Add branch ruleset** (or classic branch protection) targeting
`main`:

- **Require a pull request before merging** (at least 1 approval; dismiss stale
  approvals on new commits).
- **Require status checks to pass before merging**, and add these **exact check names**
  (they appear in the list only after each workflow has run once):
  - `Verify (typecheck, lint, test, doctor, export, audit)` — from **Mobile CI**
  - `Review PR dependency changes` — from **Dependency Review**
  - `Analyze (javascript-typescript)` — from **CodeQL**
- **Require branches to be up to date before merging** (where the merge cadence makes
  this practical).
- **Require conversation resolution before merging.**
- **Block force pushes.**
- **Block branch deletion.**
- **Require signed commits** — optional future enhancement; enable once contributors
  have commit signing set up.

> If you rename a workflow job, the required check name changes — update the ruleset to
> match, or merges will block on a check that never reports.

---

## 4. Code security & analysis 🟠🔵

**Settings → Code security (and analysis):**

- **Dependency graph:** enabled (required for Dependabot + dependency review).
- **Dependabot alerts:** enabled.
- **Dependabot security updates:** enabled (auto-PRs for known vulnerable deps).
- **Code scanning:** this repo uses the committed **advanced** CodeQL workflow
  (`codeql.yml`). **Do not also enable GitHub's *default* CodeQL setup** — running both
  conflicts and fails analysis. Pick the advanced workflow.
- **Secret scanning:** 🔵 enabled where available (public repos free; private repos need
  GitHub Advanced Security).
- **Secret scanning push protection:** 🔵 enabled — blocks commits that contain detected
  secrets before they reach the remote.

---

## 5. Vulnerability reporting & policy 🟠🔵

- **Private vulnerability reporting:** 🔵 enable under **Settings → Code security** if
  available for this repository. Once enabled, `SECURITY.md`'s "Report a vulnerability"
  flow becomes active. (Until then, `SECURITY.md` correctly tells reporters to check for
  the button rather than assuming it exists.)
- **Security policy visibility:** `SECURITY.md` at the repo root is automatically
  surfaced under the **Security** tab and on the "Report a vulnerability" page.

---

## 6. Merge strategy 🟠

- Recommend **Squash merging** as the default (clean, linear `main` history) and
  consider disabling merge commits. Enable **auto-delete head branches** after merge to
  keep the branch list tidy. (This is a convenience setting, distinct from the ruleset's
  "block branch deletion" on `main`.)

---

## 7. What this does **not** do

- It does not enable **EAS Build/Submit**, store deployment, or any release automation —
  out of scope for this task.
- It does not configure backend authentication, authorization, rate limiting, or
  monitoring — there is no backend yet (see `SECURITY.md` and the production-readiness
  audit).
- It does not auto-merge Dependabot PRs — every dependency PR is reviewed manually.
