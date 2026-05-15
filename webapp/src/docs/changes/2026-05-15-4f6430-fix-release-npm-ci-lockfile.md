---
id: 2026-05-15-4f6430
name: Fix release pipeline npm ci lockfile mismatch
description: Regenerate webapp/package-lock.json so `npm ci` succeeds on CI (missing typescript@5.9.3 from lock file).
status: implemented
modules: [webapp]
---

## Context

The `release-webapp` GitHub Actions workflow is failing at the `npm ci` step with:

```
npm error `npm ci` can only install packages when your package.json and
package-lock.json or npm-shrinkwrap.json are in sync.
npm error Missing: typescript@5.9.3 from lock file
```

The lockfile is **not** stale from npm's own perspective: regenerating it
locally (`rm -r node_modules && npm install`) produced zero diff, and a
local `npm ci` against the committed lockfile succeeds. The mismatch is
between **npm versions**:

- Local: node v25.9.0, npm 11.13.0 (used to generate the committed lockfile).
- CI (`.github/workflows/release-webapp.yaml`): `actions/setup-node@v4`
  with `node-version: 22`, which ships npm ~10.x.

npm 11 and npm 10 disagree on how a particular transitive peer
(`typescript@5.9.3`, almost certainly pulled in by the `@swc/jest@^0.2.39`
addition in commit `17ab194`) should be materialized in the lockfile.
npm 11 considers it satisfied at a parent node; npm 10's `npm ci`
considers the entry missing and aborts.

This is a CI-environment bug, not a lockfile-content bug — so the fix has
to live in the workflow, not in `package-lock.json`.

## Change

Edit `.github/workflows/release-webapp.yaml`:

1. Pin both `setup-node` jobs to a node version that ships npm 11+, OR
   add an explicit `npm install -g npm@11` step after `setup-node` and
   before `npm ci`. Recommended: bump `node-version` from `22` to a
   current LTS that ships npm 11 (e.g. `node-version: 24`), to keep the
   environment internally consistent.
2. Apply the same change to the second job in the same file (line 116)
   and audit the other workflows for the same pattern:
   - `.github/workflows/e2e-test.yaml` (uses `npm install`, less strict —
     may not need the bump but should be aligned to avoid future drift).
   - `.github/workflows/release-website.yaml`,
     `.github/workflows/sonarcloud.yml`, `.github/workflows/codeql.yml`
     — check and align if they touch `webapp/`.
3. Optionally add `engines.node` / `engines.npm` to `webapp/package.json`
   and a `.nvmrc` at the repo root so local and CI converge on one
   declared version. Out of scope for this change unless the workflow
   pin alone is insufficient.

Do **not** modify `webapp/package-lock.json` — it is already correct
under npm 11 and any regeneration on an older npm would re-introduce the
inverse mismatch.

## Status notes

Implemented. Bumped `node-version: 22 → 24` in all five `setup-node@v4`
call sites across `.github/workflows/`:

- `release-webapp.yaml` (lines 39, 116)
- `release-website.yaml` (lines 20, 71)
- `e2e-test.yaml` (line 342)

Verified locally with `nvm use 24` (node v24.15.0, npm 11.12.1) that
`npm install` produces zero lockfile diff and `npm ci` succeeds against
the committed `webapp/package-lock.json`.

Pending verification: trigger the `release-webapp` workflow on CI to
confirm the `npm ci` step now passes end-to-end.

## Security

None. Lockfile regeneration may shift transitive versions; review the diff
for unexpected major bumps and re-run `npm audit` if the change is large.

## Performance

None. No runtime code is touched. CI install time may marginally change
based on the resolved tree.
