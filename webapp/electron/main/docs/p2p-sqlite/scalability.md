# Peer-to-peer SQLite: scalability

What this design has to survive, what it costs today, and which parts are held
by something other than hope. Architecture first:
[overview.md](./overview.md).

Every number below is measured, and each says where from. Nothing here is a
projection unless it is labelled one.

## The requirements

| # | Requirement | Source |
|---|---|---|
| R1 | **10 000 materials must be comfortable on a laptop** — boot, browse, search, edit. | The ask that killed Jazz: "we need to be able to support 10k easily locally". |
| R2 | **100 000 materials in production.** | Same. Jazz projected to minutes of boot and ~3 GB at that size. |
| R3 | **Boot must not scale with catalog size.** | Jazz booted in 24 s at 2 110 materials because opening a `co.record` verifies one transaction per entry, forever. |
| R4 | **A local edit must not get slower as peers or history grow.** | An editing session is the product; sync is a courier. |
| R5 | **Convergence must not depend on who connected first**, or on anyone staying online. | Offline-first was the one thing Jazz did well and we are not giving it up. |
| R6 | **Storage growth must be a function of rows, not of edits.** | The specific defect of a transaction log: history is forever, and re-verified on every open. |

## What holds each one

### R3, R1 — reads are index seeks

The catalog is ordinary indexed SQLite. Nothing walks history, so nothing pays
for it.

| | Jazz @ 2.1k | SQLite @ 10k | SQLite @ 100k |
|---|---|---|---|
| First page (100, ranked) | 3 300 ms | 0.39 ms | 0.35 ms |
| One row by id | 150 ms warm | 0.046 ms | 0.025 ms |
| Search → 100 hits | 8 800 ms + scan | 4.9 ms | 44 ms |
| Bulk write | 1.6 rows/s | 52 000 rows/s | 48 000 rows/s |

(`scripts/devtools/catalog-sqlite-bench.mjs`; the Jazz column is
[jazz-is-dead.md](../../../../src/docs/jazz-is-dead.md).)

Boot went 24.2 s → 3.7 s (Jazz fixes) → **0.48 s**, with zero catalog resolves.
Boot no longer reads the catalog at all — it opens a file and runs migrations.

**What enforces it:** reads are windowed by construction.
`DEFAULT_WINDOW_LIMIT` is 100 and `MAX_WINDOW_LIMIT` is 1 000, clamped inside
`loadWindow` where no caller can opt out. The renderer holds a *window*, not
the catalog (`Materials/docs/architecture/catalog-mirror.md`). A read path that
wants everything must walk pages, and the one caller that asks for everything
now does — it used to ask for one page the size of the catalog and get a
silently truncated answer (change `2026-08-30-4e98f7`).

### R6 — replication metadata is per column, not per edit

This is the structural difference from a CRDT log, and the reason cr-sqlite is
viable where cojson was not.

cr-sqlite keeps one clock row per `(row, column)`. Editing a material a
thousand times bumps `col_version` in place; it does **not** append. Measured on
a live workspace:

```
materials                 5 703 rows   →  materials__crsql_clock       108 357  =  5 703 × 19 columns
material_edges           17 099 rows   →  material_edges__crsql_clock   85 495  = 17 099 × 5 columns
```

Exactly `rows × columns`, both of them. History does not accumulate. Compare
Jazz, where a material was ~19 CoValues and 43 KB, every transaction kept and
re-verified on every open.

**Bounded growth that does exist:** a delete leaves a tombstone in the clock
tables (that is how a deletion replicates), so a workspace that churns rows
grows slowly in metadata. Bounded by rows ever created, not by edits.

### R1, R2 — storage

Same workspace, per-table page counts from `dbstat`:

| Table | MB | Note |
|---|---|---|
| `materials` | 5.58 | 5 703 rows |
| `materials__crsql_clock` (+ its index) | 5.43 | replication metadata |
| `materials_fts_content` | 0.49 | search |
| `material_edges` + indexes + clock + pks | ~10.5 | 17 099 rows (≈3 per material) |
| `model_documents` | 40.18 | one attachment; unrelated to catalog size |

**Replication roughly doubles the catalog's footprint** — 5.58 MB of rows
carries 5.43 MB of clock. All in, ≈ **4 KB per material** including its edges,
FTS content and replication metadata.

Projected: **100 000 materials ≈ 400 MB.** Against Jazz's ~43 KB per material
(≈ 3 GB projected at 100k), and against plain non-replicated SQLite at 1.3 KB.
Replication is the price and it is a factor, not an order of magnitude.

Hard ceilings that are not ours: a single SQLite value is capped at
`SQLITE_MAX_LENGTH`, **1 GB in this build** (not the 2 GB SQLite can be
compiled for). The app's own attachment limit, `MAX_DOCUMENT_BYTES` = 256 MB,
is set by memory rather than by the engine.

### R4 — a local edit costs one push of its own rows

- **Pushes are event-driven.** A write path calls `push()`; an idle peer does
  no work.
- **A push is author-filtered** (`changesSince(…, ownSite)`). Without that
  filter a peer that had just caught up echoed the entire merged history on its
  next edit: **193 898 rows re-sent after one edit**. With it, the same probe
  moved **4 rows**. Verified live in the two-peer session.
- **The push cursor is in-memory**, so a push is a `db_version >` seek over an
  indexed column, not a scan.
- **Applying is one transaction**, so cost is linear in the batch and paid once.

Measured propagation, live two-peer session on a 5 703-material workspace: a
new material reached the other peer in **1 785 ms**, an edit came back in
**5 ms**. The collaborative perf suite, at 103 materials: convergence across 4
peers **235 ms** (budget 20 000 ms); search under sustained churn **494–557 ms**
across 2–5 peers (budgets 3 000–4 000 ms); propagation under churn **5 ms**.

### R5 — convergence does not depend on order or uptime

- A peer asks `want` on **every** connect, not just the first.
- The relay broadcasts `joined`, and every member re-asks on it — so a gap
  closes whichever way round two peers arrived. Without this, a peer that
  connected *after* another's question never heard it, and a model created
  before the other peer joined never crossed (found in the collaborative
  suite).
- Any peer can answer any `want`: cr-sqlite re-stamps applied changes with the
  local clock while preserving the originating `site_id`, so a third peer
  relays changes it did not write. Nobody has to stay online.
- Cursors live in `crsql_tracked_peers` and are written in the same transaction
  as the rows they describe, so a crash cannot skip changes.

## The limit we have not solved: bootstrap

A fresh peer joining a populated workspace asks for everything from version 0
and gets it in **one message**. Measured wire cost: **267 bytes per change row**
(real rows, real encoding).

| Workspace | Change rows | One bootstrap message |
|---|---|---|
| 5 703 materials (measured) | 193 939 | **49 MB** |
| 100 000 materials (projected, 34 rows/material) | ~3.4 M | **~0.84 GB** |

`ws` caps a message at **100 MiB** by default, on both client and server. So:

- at ~5.7k materials a bootstrap already sits at half the ceiling;
- somewhere around **12k materials a first sync stops working** — the receiver
  drops the connection rather than erroring usefully;
- at 100k it is not close.

R2 is therefore **not met for a new peer joining an existing large workspace**,
and it is stated here rather than discovered later. What has to happen, in
order of value:

1. **Bootstrap by file copy.** Ship the SQLite file (or a `VACUUM INTO`
   snapshot) and let cr-sqlite carry on from its `db_version`. Replaying 3.4 M
   change rows to reconstruct a database we already have is the wrong shape of
   work, at any message size.
2. **Chunk `changes` messages** with a row budget, so no single message can
   exceed the frame cap and a large catch-up applies incrementally.
3. **Backpressure**: a peer that is behind should not be sent faster than it
   can apply, and a push should not block the write that triggered it.

Steady-state sync is unaffected by all three — an edit is tens of rows.

## How this stays true

- **Budgets, tiered by cardinality.** `tests/**/performance` seeds 1k / 10k /
  100k by the tier-appropriate path and asserts durations against budgets
  (`src/docs/quality/e2e-tests.md` §11). Heavy tiers are opt-in via
  `KLIPPEL_PERF_HEAVY=1` so the default suite stays fast and the tier stays
  runnable without editing a file.
- **Collaborative budgets exist too** — convergence and search-under-churn are
  asserted with 2, 3, 4 and 5 peers, so a regression in fan-out shows up as a
  failing test rather than as a slow debug session.
- **A regression is investigated before a budget is moved.** The recorded
  method: stash the change, re-measure, compare against baseline, and only then
  recalibrate deliberately with the numbers written down.
- **The status surface is the field instrument.** `syncStatus().relay` carries
  `pushed`/`applied` counters, so "connected but carrying nothing" and "not
  connected" are distinguishable without reading logs — the two sync bugs found
  in the debug session both presented as "nothing happens".
- **Benchmarks are kept, not deleted**:
  `scripts/devtools/catalog-sqlite-bench.mjs` and
  `catalog-crsqlite-bench.mjs` reproduce the read/write tables above on demand.

## Open questions

- **Relay fan-out.** The relay forwards each message to every other member; it
  stores nothing, so its memory is O(peers), but its egress is O(peers ×
  message). Untested past 5 peers.
- **Attachments over the wire.** A `model_documents` blob replicates as one
  change row containing the whole BLOB — a 40 MB attachment is a 53 MB base64
  row. Under the same frame cap as bootstrap, and with no chunking yet.
- **Clock compaction.** Nothing prunes clock rows for deleted entities. Bounded
  by rows ever created, but a workspace with heavy churn will carry them.
