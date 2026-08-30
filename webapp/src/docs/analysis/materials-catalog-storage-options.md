# The materials catalog needs different storage

**Date:** 2026-08-30
**Question:** can the catalog reach 10k locally and 100k in production on Jazz,
and if not, what replaces it?
**Answer:** no — and the decision taken on 2026-08-30 was to leave Jazz
entirely rather than keep it as a sync transport. See
[jazz-is-dead.md](../jazz-is-dead.md) for the decision and
[rxdb-migration-study.md](./post-jazz-storage-study.md) for what replaces it.
This document is the measurement that produced that decision; §4's options are
kept as the record of what was weighed, not as live proposals.

Follow-on to
[materials-catalog-scale-analysis.md](./materials-catalog-scale-analysis.md)
(the diagnosis) and to the boot work landed as
`Materials/docs/changes/2026-08-30-ea4277-catalog-off-the-boot-path.md`.

---

## 1. Where we actually are

Live `pessoal` workspace, 2 110 materials, after the 2026-08-30 boot work:

| | Measured |
|---|---|
| Catalog resolve, cold (containers + material nodes) | **2.6 s** |
| Catalog resolve, warm | 0.15 s |
| First window read (100 rows) | 3.3 s |
| Deriving searchable text for every row | 8.8 s |
| Whole-catalog deep resolve (what every call did before) | 11.9 s |
| Store on disk | 90 MB — **43 KB per material** |
| Bulk import throughput | **1.6 rows/s** |

The 2.6 s is a floor, not an inefficiency to tune away: it is the cost of
loading and verifying the `materials` and `edges` record CoValues themselves.
No resolve shape gets under it, because a page cannot be read without knowing
which ids exist.

**It scales with the catalog, linearly, and it is on the interaction path.**
At 100k it is minutes, and the store is ~3 GB (§3 of the scale analysis:
~19 CoValues per material, ~1.9M CoValues at 100k). Import at 1.6 rows/s puts
100k materials at ~17 hours.

The 10k tier, measured on the fixed code with a **warm** process (the perf
suite seeds and reads in one run, so cojson already holds every CoValue and the
open cost above is not being paid):

| Surface | 1k | 5k | 10k | Budget |
|---|---|---|---|---|
| window-open | 535 ms | 1 391 ms | 4 155 ms | 4 500 ms |
| search | 992 ms | 1 378 ms | 2 606 ms | 2 500 ms — **over** |
| page-in p95 | 386 ms | 673 ms | — | 2 000 ms |

`page-in` and `scroll-sweep` did not produce a 10k measurement: the search test
failed before them and left the view on a single hit, so there was nothing to
page or scroll. They are cascade failures, not budget breaches.

So: **10k is not reachable by tuning, and 100k is not reachable at all.**

## 2. What it costs in plain SQLite

Same row shape — 12 attributes, 3 edges, ranked by usage, searched over
name / colour / type / industry / externalId — in SQLite with an FTS5 index,
via `node:sqlite`, cold (database reopened before reading). Full script and
raw output kept with this change; reproduce in a minute.

| | 10 000 rows | 100 000 rows |
|---|---|---|
| Bulk write | 193 ms (**52k rows/s**) | 2.1 s (**48k rows/s**) |
| Store on disk | 13.5 MB (1.3 KB/row) | 137 MB (1.4 KB/row) |
| First page (100, ranked) | **0.39 ms** | **0.35 ms** |
| Deep page (offset 99 800) | 0.59 ms | 3.3 ms |
| Every edge of a 100-row page | 0.47 ms (300 edges) | 0.36 ms |
| One material by id | 0.046 ms | 0.025 ms |
| Full-text search → 100 hits | 4.9 ms | 44 ms |
| `count(*)` | 0.09 ms | 0.62 ms |
| Update one row | 0.08 ms | 0.06 ms |

Read the first-page row twice. **0.35 ms at 100k against 3 300 ms at 2k** —
and the SQLite number does not grow with the catalog, because a b-tree index
does not have to be loaded before it can be read. That is the whole difference:
cojson resolves a working set, SQLite seeks an index.

Import goes from ~17 hours to ~2 seconds.

Storage is ~30× smaller per row, and that is with the attributes kept as a
JSON blob — no schema migration of the *content*, just of where it lives.

## 3. Why the current shape is wrong, specifically

A material is ~19 CoValues: the node, `stock`, `position`, and one CoMap per
attribute key (×3 records). That shape buys **per-attribute CRDT merge** — two
peers editing different attributes of one material both keep their edit.

We do not use it. `updateMaterial` (`main/materials.ts`) replaces the whole
attribute record on every save:

> Replace the whole attribute record. Per-attribute CRDT preservation is a
> future refinement; the renderer currently submits the full attribute block on
> every form save.

So we pay 19 CoValues per row, 43 KB per row, and a whole-catalog resolve
before every read, for a merge semantic the write path throws away. The
catalog is also the least collaborative thing in the app: it is imported in
bulk from supplier spreadsheets and edited occasionally by one person, while
the genuinely concurrent editing happens in models and budgets.

**The catalog is a queryable dataset that happens to sync. It is currently
stored as a fine-grained collaborative document that happens to be queried.**

## 4. Options

### Option A — Jazz syncs a change log, SQLite answers queries *(recommended)*

Keep Jazz. Stop storing one CoValue per attribute.

- The catalog becomes an **append-only log of change records**, chunked
  (~500 materials per `co.plainText`/`co.list` entry). 100k materials is a few
  hundred CoValues instead of 1.9M.
- Main **projects the log into SQLite** on arrival — the tables benchmarked
  above — and every read (`loadMaterialsWindow`, `getMaterial`, search, rank,
  by-type) becomes a query against it. The renderer's windowing, residency and
  mirror contracts (`catalog-mirror.md`) do not change at all: same IPC, same
  DTOs, same invariants, different thing answering them.
- A write appends a record and applies it locally. Last-writer-wins per
  material, which is what the write path already does.
- Compaction: periodically rewrite the log as a snapshot chunk set.

Why this one: it keeps a single sync stack, one account model, and the existing
peer/join/share flows; it needs no server we do not already run; and it is
incremental — the projection can be built and validated against the current
catalog before anything switches over. It also fixes import, which is the same
bug from the other end.

Risks to resolve before committing: initial hydration of a large log on a
fresh peer; how compaction interacts with peers that are behind; whether
cojson's per-chunk transaction size is comfortable at ~500 rows.

### Option B — RxDB + a replication endpoint

Replace Jazz for the catalog with RxDB over a SQLite storage adapter and its
replication protocol. Gives the query engine *and* a well-trodden sync story,
at the cost of a second sync stack alongside Jazz (models, documents, budgets
stay there), a replication server to run and operate, and a second identity /
permission model to reconcile with the workspace sharing we already have.

Worth it only if Option A's log sync turns out to be the bottleneck, or if the
catalog is ultimately server-owned (see §6).

### Option C — shrink the CoValue shape, stay on Jazz for everything

One CoValue per material with attributes as a JSON field: ~19 → ~2 CoValues
per row. That is Fix 4 of the scale analysis. It makes 10k plausible
(~1.2 s floor extrapolated) and 100k still bad (~12 s), because the floor is
still linear in catalog size and still paid before any read. It is strictly
less work than Option A and strictly less capable; it buys time, not headroom.

## 5. What was decided

**Superseded.** Option A was the recommendation when this was written; the 10k
measurement in §1 (step 1 below, now done) and the cojson finding in
[jazz-is-dead.md](../jazz-is-dead.md) — that every transaction is re-verified
on every load, with no local snapshot — moved the decision to leaving Jazz
altogether. The plan now lives in
[rxdb-migration-study.md](./post-jazz-storage-study.md) §6, whose first two phases
are steps 2 and 3 below, unchanged.

The original recommendation, for the record:

1. ~~**Measure the 10k tier on today's code**~~ — done; see §1. Search is
   already over budget warm, before any cold-start cost.
2. **Build the SQLite projection behind the existing IPC** —
   `loadMaterialsWindow` / `getMaterial` / search / rank answered from tables,
   with Jazz still the store of record. Nothing in the renderer changes, so
   this is verifiable against the current e2e suite.
3. **Move the store of record to the chunked log**, with the projection as the
   only reader. Import writes chunks.
4. **Compaction and hydration**, once 1–3 hold.

Steps 2 and 3 are separable, and step 2 alone already removes the interaction
cost — which is what "the app freezes" is.

## 6. Open questions, worth answering before step 3

- **Who owns catalog data?** If it is authored centrally (supplier imports) and
  read by everyone, the catalog wants a server and one-way replication, which
  makes Option B more attractive and Option A's conflict handling irrelevant.
  If every workshop curates its own, Option A is right.
- **Does the catalog need to sync at all**, or is sharing an export/import
  concern? A 137 MB store per peer at 100k is a real cost to replicate.
- **Attributes as JSON vs columns**: the benchmark keeps the JSON blob and
  promotes only the searched fields to columns. If reporting ever needs to
  query arbitrary attributes, that becomes an EAV table or generated columns.
  Cheap to add later, worth knowing early.
