# 006 — GitHub Security and CI Workflows Implementation Plan

> **For agentic workers:** Use `superpowers:subagent-driven-development` or `superpowers:executing-plans`. Steps use `- [ ]`. This plan only adds files under `.github/`; it does not touch app/src.

**Goal:** Gate every PR on typecheck/lint/export/test, and enable automated dependency, code-scanning, and secret-scanning hygiene.

**Architecture:** A single CI workflow runs the project's existing verification commands on push/PR. Dependabot keeps deps current. CodeQL scans JS/TS. A lightweight secret-scan job (or GitHub's native push protection) guards against committed secrets.

**Tech Stack:** GitHub Actions, Node 20, npm, Expo CLI (`npx`), CodeQL, Dependabot.

## Global Constraints

- Run the project's real verification commands; never claim success without them. — root `CLAUDE.md`
- Do not run `npm audit fix --force` (breaks SDK 54). — audit M5 / `production-readiness.md`
- No secrets in source or CI logs; use GitHub secrets for any tokens. — `.claude/rules/security.md`
- Branch (`chore/...`); no commit/push without approval. — `.claude/rules/git-workflow.md`

## Confirmed Findings Addressed

- **M5** — No CI; 21 moderate (dev/build tooling) advisories unmonitored.
- Repo-hygiene/monitoring gaps (audit §19).

## Files Affected

- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/codeql.yml`
- Create: `.github/dependabot.yml`
- Modify: `README.md` — CI status + contribution checks.

## Interfaces

- **Produces:** required status checks (`verify`) that branch protection can enforce. No code interfaces.

---

### Task 1: CI verification workflow

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Author the workflow**

```yaml
# .github/workflows/ci.yml
name: CI
on:
  push:
    branches: [main]
  pull_request:
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - name: Typecheck
        run: npx tsc --noEmit
      - name: Lint
        run: npm run lint
      - name: Expo Doctor
        run: npx expo-doctor@latest
      - name: Test
        run: npm test --if-present
      - name: Web export
        run: npx expo export --platform web
      - name: Audit (report-only, non-blocking)
        run: npm audit --audit-level=high || true
```

Notes: `npm test --if-present` is a no-op until `plans/004` adds the script, then runs automatically. The audit step is report-only and **must not** auto-fix.

- [ ] **Step 2: Validate YAML locally**

Run: `npx --yes js-yaml .github/workflows/ci.yml >/dev/null && echo OK`
Expected: `OK` (valid YAML).

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: verify typecheck/lint/doctor/test/export on PRs"
```

---

### Task 2: CodeQL code scanning

**Files:**
- Create: `.github/workflows/codeql.yml`

- [ ] **Step 1: Author the workflow**

```yaml
# .github/workflows/codeql.yml
name: CodeQL
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 6 * * 1'
jobs:
  analyze:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
      actions: read
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: github/codeql-action/init@v3
        with:
          languages: javascript-typescript
      - uses: github/codeql-action/analyze@v3
```

- [ ] **Step 2: Validate YAML + commit**

```bash
npx --yes js-yaml .github/workflows/codeql.yml >/dev/null && echo OK
git add .github/workflows/codeql.yml
git commit -m "ci: add CodeQL scanning for JS/TS"
```

---

### Task 3: Dependabot

**Files:**
- Create: `.github/dependabot.yml`

- [ ] **Step 1: Author the config**

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: npm
    directory: "/"
    schedule:
      interval: weekly
    open-pull-requests-limit: 5
    groups:
      expo:
        patterns: ["expo", "expo-*", "@expo/*"]
  - package-ecosystem: github-actions
    directory: "/"
    schedule:
      interval: weekly
```

- [ ] **Step 2: Validate YAML + commit**

```bash
npx --yes js-yaml .github/dependabot.yml >/dev/null && echo OK
git add .github/dependabot.yml
git commit -m "ci: enable Dependabot for npm and actions"
```

---

### Task 4: Document and recommend protections

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add a CI/contribution section**

Document in `README.md`: PRs must pass the `verify` job; locally run `npx tsc --noEmit`, `npm run lint`, `npm test`, `npx expo export --platform web` before pushing.

- [ ] **Step 2: Record manual GitHub settings (cannot be set via files)**

Add a checklist note for a maintainer to enable in repo settings: branch protection requiring `verify` + CodeQL; **Secret scanning + push protection** (GitHub-native); Dependabot alerts. These are dashboard settings, not committable.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: document CI gates and required GitHub protections"
```

---

## Security Considerations

- CodeQL + secret-scanning/push-protection address the "credentials committed to Git" risk class proactively.
- No secrets are placed in workflow files; any future tokens (e.g. EXPO token for EAS in `plans/008`) go in GitHub Actions secrets.
- Audit step is report-only to avoid an automated breaking `--force` upgrade.

## Testing Requirements

- YAML validity for all three files (Tasks 1–3).
- Open a draft PR and confirm the `verify` job runs and passes against current `main` (which is already green per audit §20).

## Acceptance Criteria

- `verify` runs typecheck/lint/doctor/test/export on every PR and passes on the current tree.
- CodeQL and Dependabot are active.
- README documents the gates and the manual protection settings.

## Verification Commands

```bash
npx --yes js-yaml .github/workflows/ci.yml >/dev/null && echo OK
npx --yes js-yaml .github/workflows/codeql.yml >/dev/null && echo OK
npx --yes js-yaml .github/dependabot.yml >/dev/null && echo OK
# Local mirror of the CI job:
npx tsc --noEmit && npm run lint && npx expo-doctor@latest && npm test --if-present && npx expo export --platform web
```

## Rollback Considerations

- All files are under `.github/`; deleting them fully removes the workflows. No app behavior is affected.

## Dependencies

- Independent. The `test` step is a no-op until `plans/004`; no hard dependency.

## Estimated Implementation Risk: **Low**
