---
id: 2026-05-16-932980
name: Jazz-backed workspace foundation + Models CoValue layer
description: Per-workspace SQLite-backed Jazz node, workspace + model + edit-lease CoSchemas, and the renderer↔main IPC surface that backs Composer's model storage.
status: implemented
modules: [Store, Composer]
---

## Context

Klippel's workspace system was entirely local: JSON files in `~/klippel/envs/{ENV}/workspaces/` persisted via fs-extra through Electron IPC. Helia was scaffolded but unused. The goal of the [user-management.md](../../../../docs/user-management.md) plan is to make workspaces local-first (always functional offline) and distributed (multi-device sync, optional sharing) using **Jazz.tools exclusively** — single sync system, single source of truth.

This change covers **Phase 1** (SQLite-backed Jazz node) and **Phase 2** (Models migration onto Jazz CoValues, including the explicit save button + commit message UX). The kernel Store layer hosts the schema and the IPC surface; the Composer module consumes that surface for model storage.

## Change

### Phase 1 — SQLite-backed Jazz node foundation

- New main-process files:
  - [electron/main/jazz.ts](../../../../../electron/main/jazz.ts) — `openWorkspaceJazzNode` opens a per-workspace `jazz.sqlite` with WAL + tuned pragmas, takes a `.db.lock` via `proper-lockfile`, bootstraps a new Jazz account on first run (and persists `.account-creds.json`) or reuses existing credentials via `createJazzContextFromExistingCredentials`. Graceful close runs `wal_checkpoint(TRUNCATE)` and releases the lock.
  - [electron/main/jazz-hooks.ts](../../../../../electron/main/jazz-hooks.ts) — IPC handlers (`jazz-open-workspace`, `jazz-close-workspace`, `jazz-get-account-id`, `jazz-create-workspace`, `jazz-list-workspaces`).
  - [electron/main/workspacesIndex.ts](../../../../../electron/main/workspacesIndex.ts) — `~/klippel/envs/{ENV}/workspaces.index.json` reader/writer (`{ name, coId, syncOptIn }[]`).
- New preload bridge: [electron/preload/jazz.ts](../../../../../electron/preload/jazz.ts) exposes `window.electron.jazz.*`.
- New kernel module file: [schema.ts](../schema.ts) — `KlippelAccount` (with `withMigration` that initializes `profile` + `root`), `WorkspaceCoMap`, `WorkspaceMetadata`, `KlippelRoot`.
- Store integration: [state.ts](../state.ts) adds `workspaceCoIds`, `accountId`, `syncStatus`; [actions.ts](../actions.ts) adds `accountIdResolved`, `syncStatusChanged`; [middlewares.ts](../middlewares.ts) routes `createWorkspace` through `jazz.createWorkspace` (falls back to file-only on failure).
- Main process: [electron/main/index.ts](../../../../../electron/main/index.ts) wires `initJazzHooks()` at boot and `closeActiveWorkspace()` on `before-quit`.
- Regression coverage: [tests/jazzFoundation.e2e.test.ts](../tests/jazzFoundation.e2e.test.ts) asserts WAL mode, `.jazz-id` + index entry, and WAL truncate-on-close.

### Phase 2a — Schema + IPC for models

- [schema.ts](../schema.ts) gains `ModelCoMap` (`graphJson` as atomic `z.string()`, optional `svg: co.fileStream()`, optional `editLease: EditLease`, `updatedAt`), `ModelsMap = co.record(z.string(), ModelCoMap)`, and `EditLease`. `WorkspaceCoMap` now has a `models` ref.
- [electron/main/jazz.ts](../../../../../electron/main/jazz.ts) gains: `requireWorkspace()` (lazy-loads the `WorkspaceCoMap` with `models` + `editLease` deep-resolved), `listModels`, `loadModel`, `createModel`, `updateModelGraph`, `updateModelDescription`, `acquireEditLease`, `renewEditLease`, `releaseEditLease`. A 60s lease TTL is enforced.
- IPC handlers and preload bindings for all of the above.

### Phase 2b — Composer cutover

See [the matching Composer doc](../../../../system/modules/Composer/docs/changes/2026-05-16-932980-jazz-foundation-and-models-migration.md) for the full Composer change set.

## Status notes

**Implemented through Phase 2c.**

Done (Phase 1 + 2a + 2b + 2c):
- SQLite-backed Jazz node + per-workspace lockfile.
- Account bootstrap + credential persistence (`.account-creds.json`).
- Workspace + model + lease + SVG IPC surface.
- BinaryCoStream-backed SVG upload/download (`uploadModelSvg` / `loadModelSvg`).
- Lease auto-renew (on focus + 30s timer) and release (unmount + 90s idle)
  driven by the renderer's `useEditLease` hook.
- Read-only `LeaseBanner` in `ModelViewport` when another peer holds the lease.
- DOMPurify-based SVG sanitization in
  `kernel/modules/SVG/utils/sanitizeSvg.ts`, invoked from the SVG slice's
  `loadSVG` middleware and Composer's `uploadSVG` middleware so the
  scrubbed bytes are what hit the BinaryCoStream.
- E2E coverage for Phase 1 (`Store/tests/jazzFoundation.e2e.test.ts`) and
  Phase 2 (`Composer/tests/models-jazz.e2e.test.ts`).

Not in scope yet (later phases):
- Cedar PDP + receive-validator + re-key on demote (Phases 5–7).
- Legacy `Models/*.json` migration (deferred per the original design discussion — only new workspaces use Jazz; old workspaces stay file-based until migration lands).

Architectural decisions encoded so far:
- **Always-on Jazz for new workspaces** — no feature flag; legacy workspaces are untouched.
- **`disallowRelay: true` by default** — workspaces are direct-peer-only until the user opts in to cloud sync.
- **Wire types live in Composer**, not in the kernel: `ModelSummary`, `LoadedModel`, `EditLeaseSnapshot`, `CreateModelInput` are exported from [Composer/typings.ts](../../../../system/modules/Composer/typings.ts) and re-imported by `electron/main/jazz.ts` and `electron/preload/jazz.ts` so the kernel layer stays free of Composer-internal shapes.

## Security

- **Account secrets** persist to `<workspace>/.account-creds.json` in plaintext on disk. OS-level encryption (FileVault / BitLocker / LUKS) is the recommended baseline; passphrase-wrapping is plan-Phase-9 work and not yet implemented.
- **Receive-validator is not present yet.** Any peer with Jazz write access (no peers today — `disallowRelay: true` and no Cedar PDP) could in theory inject mutations once sync turns on. Phase 6 of the plan addresses this. Do **not** enable `syncOptIn` on a workspace before Phase 6 lands.
- **Edit lease is best-effort, not authoritative** in this phase: `updateModelGraph` checks the lease in the main process before publishing, but a malicious renderer could bypass this check until the receive-validator is in place.
- The `.db.lock` file enforces single-writer on the SQLite database; a second Electron instance opening the same workspace fails fast.
- New IPC surface: every Jazz IPC handler runs in the main process and validates input shape implicitly via TypeScript. There is no payload-size cap yet — Phase 9 hardening (16 MiB cap on `jazz-mutate`) is not done.

## Performance

- WAL mode + 256 MiB mmap + 64 MiB page cache: SQLite reads scale linearly with workspace size; writes are bounded by WAL flush cadence (`wal_autocheckpoint=1000`).
- `requireWorkspace()` re-loads the `WorkspaceCoMap` on every model IPC call. This is acceptable while we're below the plan's 500-model budget; we'll cache the loaded handle when we move to lazy hydration in plan Phase 3.
- `updateModelGraph` rewrites the entire serialized graph as a single CRDT mutation. Per the plan, this is intentional — atomic-string fields are faster than per-node CRDTs for graphs that are loaded/saved whole. History bloat is bounded by the explicit-save UX (no auto-save, no debounce-on-keystroke).
- SVG upload goes through `BinaryCoStream` which chunks internally; for SVGs under ~1 MiB the overhead is negligible. SVGs over 16 MiB will fail at the Jazz layer.
- No benchmarks run yet. The 500-models-under-200ms metadata-load budget from the plan applies once Phase 3 lazy hydration is implemented.
