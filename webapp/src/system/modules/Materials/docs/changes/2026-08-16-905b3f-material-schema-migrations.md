---
id: 2026-08-16-905b3f
name: Material schema migrations applied on read
description: Rows stay pinned to the version they were written with; a chain of per-version migrations brings them up to the latest shape as they are read, and a write is what makes it permanent.
status: draft
modules: [Materials]
---

## Context

Material types are versioned and immutable: `updateMaterialType` registers a
*successor* (`tecido@0.0.5`) and leaves every existing row pinned to its
predecessor, still carrying the predecessor's attribute shape. That is the
right storage model — a material's `attributes` conform to the version it
pinned, and re-reading an old row through a new schema is exactly the bug
`selectorExtraKey` guards against — but it means registering a version is only
half a change. The rows never move.

The case that raised this: `tecido@0.0.5` drops `codigoCor` and keeps `cor`,
with the code folded into the colour's label as `{label} ({codigoCor})`. There
are a few hundred `tecido` rows on 0.0.3 / 0.0.4. Today the only ways to move
them are editing each row by hand, or a developer running a one-off script
against the catalog IPC.

**Decision: migrate on read, via a version chain.** Rows are not rewritten in
bulk. Each schema version carries the mapping from its predecessor, and a row
is brought up to the latest shape as it is projected. The stored CoValue is
untouched until something writes it — at which point it is saved in the new
shape, which is how data migrates for real, one edited row at a time.

This is deliberately the opposite of a batch job. The properties that follow
are the reason:

- **A wrong migration harms nothing.** Nothing was rewritten, so fixing the
  rules fixes every row. A batch run that folded a label wrongly would have
  needed a restore.
- **There is no run to schedule, resume, or half-complete.** No progress bar,
  no partially-migrated catalog, no "which rows did it reach?".
- **A peer that has not synced the new version yet** simply keeps reading the
  old shape. Nothing is corrupted, because nothing changed on disk.

The costs are equally real and are what the design has to answer: the mapping
now runs on a hot path, and the stored data stays old until touched.

## Change

Nothing is implemented yet. This is the shape being proposed.

### 1. A migration belongs to the version it produces

Each schema version carries the mapping **from its predecessor to itself**,
inside the version's `schemaJson` (already a synced CoValue field — no new
CoMap shape, and it travels with the type to every peer, which a read-path
migration requires):

```jsonc
{
  "version": "0.0.5",
  "attributes": { "...": "..." },
  "migration": {
    "from": "0.0.4",
    "rules": [
      { "set": "cor.label", "template": "{cor.label} ({codigoCor})" },
      { "drop": "codigoCor" }
    ]
  }
}
```

Versions already link to their predecessor (`registerTypeVersion`'s
`predecessorId`), so **the chain is derivable**: a row on 0.0.3 read against a
latest of 0.0.5 applies 0.0.4's mapping, then 0.0.5's. A missing link stops the
chain — the row is projected at the last version that applied cleanly and the
gap is reported, rather than guessed at.

**Templates, not expressions.** `{cor.label} ({codigoCor})` with dotted paths,
and rule kinds `set` / `rename` / `drop` / `default`. This settles the open
question from the batch design in favour of the restricted option: the mapping
now runs on every read, so it has to be cheap, and it is evaluated on data that
arrived from a peer, so it must not be a scripting engine. `jse-eval` stays
unused here.

### 2. Applied in main, at projection time — once

The single choke point is where a material CoMap becomes a DTO
(`materialCoMapToDto`, i.e. every window read, delta, snapshot and by-id
resolve). Everything downstream — the renderer's slice, the grid, Composer —
sees only migrated rows and never learns the mechanism exists.

It has to be main, not the renderer: **main's search index reads attributes
too** (`haystackFor`). Migrating in the renderer would leave search matching
`codigoCor` on a row whose label the user can see is folded — the exact
divergence `shared/materialSearch` exists to prevent. The engine itself is pure
and shared, so the authoring preview and the tests run the same code.

The projected DTO reports the **effective** version (what it was migrated to),
so `selectorExtraKey`'s pinned-schema logic keeps working unchanged: the pinned
version *is* the shape in hand.

### 3. A write is what makes it permanent

The Update form loads a migrated row and saves the migrated shape with the new
`schemaVersion`. Editing a row migrates it for good; untouched rows stay old on
disk and are migrated on each read. No batch job is needed — and if one is ever
wanted ("rewrite everything now"), it becomes a loop that re-saves rows through
the engine that already exists, not a separate feature.

### 4. Authoring

The mapping is authored where the version is: the "Editar tipo de material"
flow gains a mapping step, **seeded by diffing predecessor and successor** —
removed attributes propose `drop`, added ones propose `default`, and the user
edits. For `tecido` the diff proposes `drop codigoCor` and the user rewrites it
into the `cor.label` fold, which is the whole authoring flow.

Beside it, a **preview against real rows**: pick N materials still on the old
version, show attributes before → after. The preview is the review step — for
the author, and for anyone who later wants to know what a synced migration
does to their data.

### 5. Surfaces (proposed)

| Layer | File | Role |
| --- | --- | --- |
| shared | `shared/schemaMigration.ts` | pure: resolve a chain, apply rules to one attribute map, report failures |
| main | `main/materials.ts` | apply the chain in `materialCoMapToDto`; cache per row |
| main | `main/materials.ts` (index) | build haystacks from migrated attributes |
| store | `store/materialTypes/` | carry `migration` through the schema JSON; expose the chain for previews |
| UI | `UpdateMaterialTypeSection` | mapping editor seeded by the schema diff + preview |
| MCP | `mcpTools/updateMaterialType.ts` | accept the mapping, so the flow stays automatable and e2e-testable |

## Shipped ahead of this plan: a manual version move

The read-time chain is not built yet, so rows still display through the
version they pinned. In the meantime the stock viewport gained the smallest
thing that unblocks a type version bump, and it is deliberately *not* a
migration engine:

- tick rows in the grid (a column of its own, kept separate from the grid's
  selection model so ticking never opens the details panel);
- a **Versão** column shows each row's pinned version and marks the ones
  behind their type's latest — without it a version move would be invisible;
- an icon button beside the search migrates the ticked rows
  (`migrateMaterials`), then re-reads the view.

**It re-points the version and nothing else.** The patch carries `type` and
`schemaVersion` only, so main moves the row's `conformsTo` edge and leaves the
attributes untouched: nothing is dropped and nothing is re-encoded. An
attribute the successor no longer declares stays in the data, unread. A value
that must be *transformed* between versions — the `{label} ({codigo})` fold —
still needs the rule engine below, and this button will not do it.

When the read-time chain lands, this stays useful as the "make it permanent"
action for chosen rows, which is what §3 of the design calls for.

## Status notes

Draft. The two big questions from the batch design are answered by the decision
(mappings must be stored on the version, because every peer needs them on every
read; templates rather than expressions, because it is a hot path fed by synced
data). What is left:

1. **Caching granularity.** A chain per row per read is affordable only if
   memoized — keyed on material id + `updatedAt` + the type's latest version,
   invalidated with the catalog index. Needs measuring before it is assumed.
2. **How a failed chain surfaces.** A row projected at an intermediate version
   is not an error the user should have to infer from a blank cell. Proposal: a
   diagnostic on the type (its migration is broken) rather than per row, since
   the cause is one bad rule, not one bad row.
3. **Whether `schemaVersion` in the DTO should be the effective or the stored
   version.** Effective keeps every reader honest; stored keeps "what is on
   disk" visible. Possibly both fields.
4. **Composer's material references.** They read through the same DTOs, so they
   get migrated shapes for free — but this needs a check, not an assumption.
5. **Rules that cannot be expressed as templates** (splitting one attribute
   into two, unit conversions). Out of scope for the first cut; the engine
   should refuse them clearly rather than half-apply.

## Security

- **Mappings sync between peers**, so a peer evaluates a mapping another user
  authored, on every read. That is precisely why the rule language is a
  template with dotted paths and not a scripting engine: no `eval`, no
  `new Function`, no host objects, and a malformed rule fails its row rather
  than the process.
- Rule application is pure and total: a missing source attribute yields an
  absent target, never a throw that could take down a projection (and with it,
  a catalog read).
- No new IPC surface and no network surface; migrations ride on the type
  version that already syncs.

## Performance

This is the design's main cost, and where it must be measured rather than
assumed:

- **It runs on every projection.** A window read projects up to 1 000 rows, a
  delta projects the changed ones. Rows already at the latest version must
  short-circuit before any rule work — that is the common case once the catalog
  settles, and it has to be the fast path.
- **Memoize the migrated attribute map** per material id + `updatedAt` + latest
  version, invalidated alongside the catalog index. Without the cache a 1 000
  row page pays the chain 1 000 times per read.
- **The mirror is unaffected.** Migration happens in main, before the DTO
  crosses IPC, so the renderer holds exactly what it held before — the
  windowing and residency invariants in
  [catalog-mirror.md](../architecture/catalog-mirror.md) are untouched.
- Budgets to add (e2e-tests.md §11), on the existing `catalogWindowing`
  surfaces: `window-open` and `search` at 1k with a two-step chain versus a
  no-op chain. A migration that costs more than a few percent on a page read
  is a design failure, not a tuning problem.
