# Jazz is dead

**Decided:** 2026-08-30
**Status:** the catalog, models and **sync** now run on SQLite + cr-sqlite.
Jazz still holds workspace *identity* (share mints a `coId`, join resolves it),
and that is the last thread. Do not write new code against it.

How the replacement works: [p2p-sqlite/overview.md](../../electron/main/docs/p2p-sqlite/overview.md).
What it costs at scale: [p2p-sqlite/scalability.md](../../electron/main/docs/p2p-sqlite/scalability.md).

Klippel is leaving Jazz / cojson. Storage, querying and sync move to SQLite —
with **cr-sqlite (vlcn.io)** the recommended way to keep CRDT merge and peer
sync, and RxDB the priced-out alternative
([post-jazz-storage-study.md](./analysis/post-jazz-storage-study.md) — read it
before starting any of the work, including the parts it says are not decided
yet).

This note exists so nobody has to re-derive the reasoning, and so the Jazz
documents left in the tree are read as history rather than as instructions.

---

## Why

**Reading anything costs O(its whole history), every time, forever.**

cojson verifies every transaction on every load, including loads from the local
SQLite store. `skipVerify` exists in the sync manager but is only ever enabled
for server-role nodes in cojson's own tests; a local node like ours always
re-verifies. There is no locally materialized snapshot: opening a CoValue
replays and re-verifies its entire transaction log.

A `co.record` gets one transaction per entry, so the catalog's `materials` and
`edges` records cost one verification per material and per edge — **on every
app start**, growing linearly, before a single row can be read. Measured on the
live `pessoal` workspace (2 110 materials, 6 340 edges):

| | Measured |
|---|---|
| Opening just those two record CoValues | **2.4 s** (~280 µs per entry) |
| Whole-catalog deep resolve (what every IPC call did) | 11.9 s |
| Deriving searchable text for every row | 8.8 s |
| Store on disk | 90 MB — **43 KB per material** |
| Bulk import | **1.6 rows/s** — 100k materials ≈ 17 hours |

Boot was 24 s. The 2026-08-30 work
(`Materials/docs/changes/2026-08-30-ea4277-catalog-off-the-boot-path.md`) got
it to 3.7 s by not resolving what we do not need — but it could not remove the
floor, because a page cannot be read without knowing which ids exist, and
knowing that means opening the record.

At 10k materials, measured on the fixed code
(`catalogWindowing.e2e.test.ts`, `KLIPPEL_PERF_HEAVY=1`), with the process
already **warm** — the suite seeds and reads in one run, so cojson holds every
CoValue in memory and none of the verification above is being paid:

| Surface | 1k | 5k | 10k | Budget |
|---|---|---|---|---|
| window-open | 535 ms | 1 391 ms | **4 155 ms** | 4 500 ms |
| search | 992 ms | 1 378 ms | **2 606 ms** | 2 500 ms — **over** |

Warm, doing the least work we know how to make it do, 10k is already at the
edge of its budgets and search is past it. Cold start at 10k adds the record
verification on top; at 2 110 materials that alone is 2.4 s, and it is linear.
100k projects to minutes and a ~3 GB store (~19 CoValues and ~43 KB per
material). The product needs 10k comfortably and 100k in production.

The same shape in plain SQLite, same rows, cold
([benchmark](../../scripts/devtools/catalog-sqlite-bench.mjs)):

| | Jazz @ 2.1k | SQLite @ 10k | SQLite @ 100k |
|---|---|---|---|
| First page (100, ranked) | 3 300 ms | **0.39 ms** | **0.35 ms** |
| One row by id | 150 ms warm | 0.046 ms | 0.025 ms |
| Search → 100 hits | 8 800 ms + scan | 4.9 ms | 44 ms |
| Bulk write | 1.6 rows/s | 52 000 rows/s | 48 000 rows/s |
| Disk per material | ~43 KB | 1.3 KB | 1.4 KB |

An index seek does not care how big the table is. A transaction log does. That
is the whole argument.

## The second reason: we pay for merge semantics we throw away

A material is ~19 CoValues — the node, `stock`, `position`, and one CoMap per
attribute key — which buys per-attribute CRDT merge, so two peers editing
different attributes of one material both keep their edit.

`updateMaterial` replaces the whole attribute record on every save. The
renderer submits the full attribute block from the form; the merge has nothing
to merge. We were paying 19 CoValues and 43 KB per row, plus a whole-catalog
resolve per read, for a guarantee the write path discards — on the least
collaborative data in the app, which is imported in bulk from supplier
spreadsheets and edited occasionally by one person.

## What we are giving up, honestly

Jazz was not only storage, and the replacement does not cover the rest for
free:

- **Identity** — every peer a keypair, every change signed by its author.
- **Access control** — `Group` membership decides who reads and writes.
- **A zero-knowledge relay** — the sync server sees opaque encrypted payloads
  and cannot read, edit or impersonate ([join-workspaces.md](./join-workspaces.md)).
- **Offline-first convergence** without a server round trip.

cr-sqlite keeps offline convergence (per-column CRDT merge, better than what
`updateMaterial` does today) and needs only a dumb relay — but identity,
authorization and the zero-knowledge property are ours to rebuild or to
consciously drop.

**Decided the same day, and dropped knowingly:** the relay is trusted. It sees
every change in plaintext and nothing stops it forging one. Peers authenticate
to it with a shared token, and it must be operated by whoever owns the data — a
public relay is not an option under this design. Rebuilding zero-knowledge
means client-side encryption plus per-peer signatures, which is a crypto design
rather than a transport, and it interacts badly with a merge the database
performs for us. Recorded rather than glossed, because a doc implying the old
guarantee still held would be worse than the loss itself: `sync/protocol.ts`,
and [p2p-sqlite/overview.md](../../electron/main/docs/p2p-sqlite/overview.md#trust-model--read-before-changing-anything).

Offline convergence itself survived intact, and is asserted: 14 collaborative
e2e tests, including catch-up in either connection order.

## What this means for code you are writing today

- **Do not add new Jazz surface.** No new CoValue types, no new fields on
  `WorkspaceCoMap`, no new `requireCatalog` call sites.
- **Bug fixes in the Jazz layer are fine** where they keep the app usable until
  the migration lands — that is what the 2026-08-30 boot work was.
- **New persistence goes to `.session/`** if it is per-workspace UI state (the
  rules in the repo `CLAUDE.md` still apply), or waits for the SQLite store if
  it is domain data.
- The renderer contract is **not** changing: `catalog-mirror.md`'s windowing,
  residency and mirror invariants survive the migration intact. Keep following
  them.

## Documents that are now history

These describe the Jazz design and remain accurate about *what exists today*.
They are not the direction:

- [user-management.md](./user-management.md) — the Jazz-only workspace plan
- [join-workspaces.md](./join-workspaces.md) — sharing and the trust model
- [analysis/jazz-performance.md](./analysis/jazz-performance.md)
- [analysis/materials-catalog-lag-analysis.md](./analysis/materials-catalog-lag-analysis.md)
  and [analysis/materials-catalog-scale-analysis.md](./analysis/materials-catalog-scale-analysis.md)
- `system/modules/Materials/docs/jazz.md`, `system/modules/Composer/docs/jazz.md`
