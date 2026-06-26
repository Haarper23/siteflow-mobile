# Security Policy

## Project status

SiteFlow AI Mobile is currently a **portfolio / demo project**. It is a local-first
Expo (SDK 54) application with **no production backend**. The in-app sign-in is a
**local demo session only** — it is *not* production authentication and performs no
server-side identity verification. Real backend authorization (enforcing **role,
organization, and resource ownership**) will be added later and is not part of the
current build. Treat any data in the app as demo data.

## Supported versions

Because the project is in active pre-release development, only the latest commit on
the `main` branch is supported. There are no released, separately-maintained versions.

| Version            | Supported |
| ------------------ | --------- |
| `main` (latest)    | ✅        |
| Any older commit   | ❌        |

## Reporting a vulnerability

**Please do not open a public GitHub issue for a vulnerability** when the report
contains exploitable details. Public issues are world-readable and would disclose the
weakness before it can be fixed.

Preferred reporting channels, in order:

1. **GitHub Private Vulnerability Reporting** — if it is enabled for this repository,
   use the **Security → Report a vulnerability** button to open a private report.
   (If the button is not present, Private Vulnerability Reporting has not been enabled;
   use the next option.)
2. **A private GitHub Security Advisory** — request or use a private advisory draft so
   discussion and any fix stay confidential until disclosure.

When reporting, please include enough to reproduce: affected file/screen, steps, and
the impact you observed.

### Do not include sensitive data in a report

Never paste **real credentials, tokens, API keys, private company data, or personal
construction-site data** (real reports, site photos, worker/PII) into a report. Use
redacted or synthetic examples instead.

## Response expectations

This is a best-effort, non-commercial project. We aim to **acknowledge a report within
about 7 days**. This is a target, not a contractual or legal guarantee, and timelines
for a fix depend on severity and maintainer availability.

## Scope notes

- The app ships as a **public client**: anything in the bundle (JavaScript, `app.json`,
  `EXPO_PUBLIC_*` values) is readable by anyone with the build. Such values are not
  secrets and should not be reported as "leaked secrets."
- Backend-class issues (server-side validation, authorization, rate limiting, AI
  budgets) are out of scope today because there is no backend yet.
