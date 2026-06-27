# Rollback Plan

How to revert a SiteFlow AI mobile release safely. Read alongside the
[release runbook](../operations/release-runbook.md).

> **Honest limits up front.** App Store / Google Play **binaries cannot be
> instantly rolled back** — you halt the rollout and/or ship a replacement
> build, which still goes through review. EAS Update (OTA) **cannot fix
> native-code incompatibilities**. Never rewrite `main` history to "undo" a
> release; prefer **revert commits** and a **new build**. Preserve user data at
> all times.

## Stop-release condition

**Do not release, or immediately halt a release, if** there is any risk of data
loss or an incompatible storage-schema migration (the app keeps all user data in
local AsyncStorage/SecureStore — a bad migration can corrupt a field user's only
copy). When in doubt, stop and verify the migration is reversible first.

## 1. Git rollback (pre-build)

The change is still in source control only.

- Revert the offending commit(s) with `git revert <sha>` (creates new commits;
  no history rewrite) and open a PR.
- Re-run the full checklist and cut a fresh build from the corrected `main`.

## 2. Failed preview build

- No user impact (internal distribution). Fix forward: correct the issue, bump
  nothing user-facing, rebuild `--profile preview`.
- If a tester already installed a bad preview, ask them to delete and reinstall
  the corrected build.

## 3. Failed production build, before submission

- Nothing shipped. Discard the artifact, fix `main` (revert if needed), bump the
  native build number, and rebuild `--profile production`.

## 4. Store release rollback (after submission)

- **Google Play:** halt the staged rollout in the Play Console; promote the
  previous known-good build, or submit a corrected build with a higher
  `versionCode`. There is no instant "delete the live version".
- **App Store:** you cannot un-publish instantly. Remove the build from sale /
  pause phased release if still rolling out; otherwise submit a corrected build
  with a higher `buildNumber` (expedited review if critical).
- Communicate the known issue; do not attempt to "downgrade" users — store
  binaries roll **forward**.

## 5. EAS Update (OTA) rollback — future

EAS Update is **not enabled yet** (see runbook §6). Once it is:

- Republish the last-good JS bundle to the affected channel
  (`eas update --channel <channel> --message "rollback to <hash>"`), or use
  `eas update:rollback` / `eas channel:rollout` to revert.
- Verify install/launch counts and crash-free rate in EAS Insights afterward.
- **OTA can only revert JS/asset changes.** A regression caused by native code
  requires a new native build + store release (§4), not an OTA.

## 6. Native binary incompatibility

If a JS change assumes native capabilities not present in the installed binary
(e.g. a new native module), an OTA update will crash those clients. Resolution is
a new native build per the matching `runtimeVersion`; never try to patch it OTA.

## 7. Storage-schema rollback risk

The storage layer is versioned (`STORAGE_VERSION` in `src/utils/storageCore.ts`)
and validates every record on load, dropping invalid entries rather than
crashing. Still:

- A forward migration that rewrote data is **not** automatically reversible by
  installing an older build — the older build may not understand the new
  envelope version (it fails safe to "unsupported" rather than corrupting).
- Before shipping any schema change, confirm a downgrade path or accept that
  rollback means "ship a fixed forward build", and re-read the stop-release
  condition.

## 8. Backend / API compatibility — future

There is no backend today. When one exists, a mobile release must remain
compatible with the deployed API; coordinate mobile and backend rollbacks and
add API-version checks. Document that contract when the backend lands.

## After any rollback

- Re-verify monitoring (crash-free rate recovering; no new error spike).
- Add a regression test for the defect where practical.
- Record what happened in the release notes / incident log.
