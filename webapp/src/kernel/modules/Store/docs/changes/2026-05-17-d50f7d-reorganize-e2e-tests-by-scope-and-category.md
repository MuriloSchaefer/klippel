---
id: 2026-05-17-d50f7d
name: reorganize e2e tests by scope and category
description: Migrate Store e2e tests into tests/standalone/persistence/{jazz,session-management}/ under the new module-wide layout.
status: in progress
modules: [Store]
---

## Context

Part of the workspace-wide e2e reorganization defined in `webapp/src/system/modules/Composer/docs/changes/2026-05-17-d50f7d-reorganize-e2e-tests-by-scope-and-category.md` (same id; cross-module change). The Store module owns one e2e file today (`tests/jazzFoundation.e2e.test.ts`) which currently bundles four concerns into a single file: SQLite/WAL setup, `.jazz-id` + index entry creation, the single-writer lock, and WAL truncation on shutdown.

Under the new layout, persistence tests split into `persistence/jazz/` (CoValue durability, SQLite-backed rehydrate) and `persistence/session-management/` (locks, leases, identity handoff). The single-writer lock belongs in the latter.

## Change

Move and split `webapp/src/kernel/modules/Store/tests/jazzFoundation.e2e.test.ts`:

- → `tests/standalone/persistence/jazz/jazzFoundation.e2e.test.ts`
  Keeps: SQLite file creation, `journal_mode=WAL`, `.jazz-id` present, `workspaces.index.json` entry, WAL truncation on graceful shutdown.
- → `tests/standalone/persistence/session-management/singleWriterLock.e2e.test.ts`
  Extracted: single-writer lock rejects a second instance.

Each resulting file owns its own `beforeAll` workspace via `resetWorkspace` per the e2e doc Section 4.

## Status notes

Draft. Sequenced after Pointer (single-file dry run) per the master plan.

## Security

None. The lock behavior being tested is unchanged; only the file location changes.

## Performance

None.
