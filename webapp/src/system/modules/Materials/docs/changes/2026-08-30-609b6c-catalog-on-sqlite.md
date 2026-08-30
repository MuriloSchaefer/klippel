---
id: 2026-08-30-609b6c
name: Catalog moves to SQLite
description: The materials catalog lives in a per-workspace SQLite database with a cr-sqlite-compatible schema — reads, writes and delta ticks. Jazz is read once per workspace, to carry an existing catalog across, and never written.
status: implemented
modules: [Materials, Store]
---

## Context

Phase 1 of [post-jazz-storage-study.md](../../../../docs/analysis/post-jazz-storage-study.md),
under the decision recorded in [jazz-is-dead.md](../../../../docs/jazz-is-dead.md):
cojson re-verifies every transaction on every load and keeps no local
snapshot, so opening the catalog costs one verification per material and per
edge on **every** app start, growing linearly. At 2 110 materials that was 2.4 s
before a row could be read; at 10k the warm surfaces were already over budget.

## Change

**A workspace database** (`electron/main/db/`): `klippel.sqlite` beside
`jazz.sqlite`, WAL, migrations cursored on `user_version`, and optional
cr-sqlite loading via `KLIPPEL_CRSQLITE_EXT` — when present, the replicated
tables are upgraded with `crsql_as_crr`. The kernel runs migrations; it defines
none. Each module contributes its own DDL.

**The catalog schema** (`Materials/main/schema/catalog.sql`) — real SQL,
inlined at build time by Vite's `?raw`. Written to cr-sqlite's rules, all
verified against v0.16.3 rather than assumed:

- Non-nullable primary keys, no `AUTOINCREMENT`; every other column
  `NOT NULL DEFAULT`; no unique indexes beyond the PK.
- **No declared foreign keys on replicated tables** — the extension's check is
  `count(*) FROM pragma_foreign_key_list(<table>)`, so any FK is rejected
  regardless of `DEFERRABLE`, `CASCADE` or the `foreign_keys` pragma. This is
  inherent: a merge can deliver an edge before its material. References are
  documented in the SQL; integrity is the writer's job. `material_usage` — the
  one non-replicated table — carries a real enforced FK with `ON DELETE CASCADE`.
- **CHECK constraints throughout**, which CRRs do allow: closed vocabularies for
  edge and organization `type`, `json_valid()` on the three JSON blobs,
  non-negative stock and timestamps.
- **Primary keys are `uuidv5(namespace, domain key)`** (`electron/main/db/ids.ts`)
  — derived, not random, so two peers projecting the same catalog compute the
  same key instead of duplicating every row on first sync. Domain ids live in
  `material_key` / `edge_key` / `type_key` / `org_key` and remain what every DTO
  carries as `id`; UUIDs never leave the main-process storage layer.

**Reads** (`catalogDb.ts`): ranked pages, type-scoped pages, by-id resolves and
search all become indexed queries. Search moved from the subsequence scorer to
an FTS5 prefix-token match over the same `buildHaystack` text the renderer
shares — indexed, and close but *not identical* to the old ranking.

**Writes** (`catalogWriter.ts`) and the **projection** (`catalogMigration.ts`,
one-time, guarded) fill it; `catalogService.ts` is the IPC surface: reads from
SQLite, writes to Jazz mirrored into SQLite, and remote deltas applied on the
way past.

To keep the mirror off the expensive path, `addMaterial` in the Jazz layer now
**returns the edges and organizations it wrote** instead of being read back —
a read-back is a whole-catalog resolve, and one per row is what made bulk
import unusable. The importer was also writing straight to the Jazz layer,
bypassing the mirror entirely; it now goes through the service.

## Phase 2 — SQLite as the store of record

Writes no longer go through CoValues at all:

- `addMaterials` / `addMaterial`, `updateMaterial`, `updateMaterialStock`,
  `deleteMaterial`, `registerMaterialTypeVersion`, and the seed / chunk paths
  all write tables (`catalogWriter.ts`). `applyMaterialUpdate` reproduces the
  parts of the old write that were not field writes: re-pointing `conformsTo`
  when the type moves, replacing the `manufacturedBy` edge (and clearing it on
  an empty industry), and replacing the whole `suppliedBy` set.
- **Delta ticks are answered from SQLite** (`catalogDelta.ts`): rows with
  `updated_at` past the client's watermark, plus tombstones, scoped to what the
  client is on record as mirroring. Two indexed range queries instead of a walk
  of every entry's signature. Migration 2 adds `catalog_tombstones`, because a
  deleted row cannot report its own deletion.
- A write notifies renderers itself (`notifyCatalogChanged`), since the Jazz
  subscription no longer fires for a local edit.
- `loadMaterialsCatalog` (the perf-harness path) is a window read sized at the
  catalog, so nothing reads CoValues on any product path.

Jazz is now read exactly once per workspace, by `catalogMigration.ts`.

## SQL lives in `.sql` files

Every statement the module runs is a file under `main/queries/`
(`read/`, `write/`, `fts/`), inlined at build time by Vite's `?raw` and reached
through one typed `SQL` barrel. Nothing outside `Materials/main` imports them:
the module's `main/index.ts` exports `materialsMain` — usage-provider
registration and ranking invalidation — and Composer goes through that instead
of reaching into `materials.ts` / `catalogService.ts`.

Two changes were needed to make the statements static, and both are
improvements in their own right:

- **Id sets go through `json_each(?)`** rather than a generated `IN (?, ?, …)`.
  SQLite caps host parameters, so the old form needed chunking at 500; the new
  one takes a page and its pins in a single bound value.
- **Partial updates go through `COALESCE(@param, column)`** rather than a SET
  clause assembled per call. NULL means "leave it alone", so the empty string
  stays a real value — which matters, because clearing a material's industry is
  an edit, not an omission.

Statements are prepared once and cached per connection (`db/prepare`), instead
of being recompiled on every page, row resolve and delta tick.

## Status notes

Done: phases 1 and 2 of the study — the catalog is on SQLite end to end.

Not done: models and documents (phase 3), sync over `crsql_changes` (4), and
deleting the Jazz layer (5). cr-sqlite is wired but **not enabled by default** —
no binary is vendored yet, so a build without `KLIPPEL_CRSQLITE_EXT` runs
unreplicated single-peer. That is correct for today and must change before
phase 4; the schema is already written to its rules so the upgrade is a load,
not a migration.

## Security

None. No new IPC channels, no change to what a renderer may request, and the
same DTOs cross the boundary. The database is per workspace under the existing
`HOME` scoping. Note for phase 4: unlike cojson, `crsql_changes` carries no
signatures — authority moves from the data to the transport, which is called
out in the study.

## Performance

The point of the change. Boot on the live 2 110-material workspace, Electron
start to an interactive grid: **24.2 s → 3.7 s** (the earlier Jazz-side boot
work) **→ 0.48 s**, with zero catalog resolves on the fast boot. Store size
90 MB → 4.0 MB. Benchmarks behind the design, at 100k rows: 0.35 ms for a
ranked page, 0.025 ms by id, 44 ms search
(`scripts/devtools/catalog-sqlite-bench.mjs`; the cr-sqlite variant costs
~10% on reads, ~14× on writes, ~1.7× disk —
`scripts/devtools/catalog-crsqlite-bench.mjs`).

Import was the worst Jazz path and is fixed by phase 2: the `importCatalog`
e2e went from *killing the app* (it wrote row by row, each write paying a
whole-catalog resolve — quadratic) to passing. The catalogRender tier numbers
show the same shape change, seed → usable view:

| Materials | Before | After |
| --- | --- | --- |
| 100 | 1 141 ms | 493 ms |
| 500 | 3 301 ms | 672 ms |
| 1 000 | 7 333 ms | 788 ms |

Near-flat with cardinality where it used to be linear.

## Tests

Run in isolation, because a suite that kills the app cascades into the rest:

| Suite | Result |
| --- | --- |
| `searchMaterials` | 2/2 pass |
| `addMaterialType` | 4/4 pass |
| `updateMaterialType` | 3/3 pass |
| `catalogPagination` | 5/5 |
| `insertMaterialToStock` | 2/2 |
| `importCatalog` | 3/3 |

Whole jobs, after the fixes below: **functionality + integrity 6 suites / 19
tests green**, **`test:e2e:perf` 4 suites / 37 tests green**.

Three failures were pre-existing and are fixed here rather than worked around:

- `catalogPagination` asserted that an *ownerless* `ensureMaterialsLoaded`
  survives a reset. Commit `06eab6b` deliberately made pins require an owner
  (invariant 8.3 — an ownerless pin is never released) and the test was not
  updated. It now pins with an owner, and a second test asserts the ownerless
  case is dropped, so the rule is covered rather than merely documented.
- **Opening a second stock tab showed an empty grid.** The unmounting viewport
  dispatches `closeMaterialsView`, which clears the view; the new instance read
  `initialized` from a ref captured at render, saw a stale `true`, and skipped
  the fetch. It reads the state value now.
- **A pointer panel in a DataGrid actions cell needed two clicks.** Selection
  moves on mousedown, the cell re-renders, and React never dispatches the
  `click` on the replaced element. `PointerContainer` opens on `mousedown`
  (allowed to bubble, so row selection still happens) and keeps `onClick` for
  keyboard activation only. Kernel-wide, so the whole suite was re-run.

Note on measuring: `catalogRender`'s budgets fail when its suites are
interleaved with the functionality suites in one process, and pass in the
dedicated `test:e2e:perf` job — contention between suites, not a regression
(verified by running the suite alone, twice, and against baseline).
