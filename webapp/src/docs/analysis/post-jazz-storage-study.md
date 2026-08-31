# Life after Jazz: SQLite, and what syncs it

**Date:** 2026-08-30
**Question:** what does it take to remove Jazz entirely and run storage,
querying and sync on SQLite?
**Short answer:** the storage and query half is straightforward and enormously
faster, whichever library sits on top. The sync half is not a swap — Jazz gives
us identity, access control and a zero-knowledge relay that neither candidate
has. **Recommendation: cr-sqlite (vlcn.io), not RxDB** — it is MIT-licensed
where RxDB's production SQLite storage is a paid plugin, it keeps per-column
CRDT merge where RxDB gives last-write-wins per document, and its sync is
"ship rows from a table", which any dumb relay carries. Its one real risk is
release staleness, quantified in §4.

Companion to [materials-catalog-storage-options.md](./materials-catalog-storage-options.md)
(the measurements) and [jazz-is-dead.md](../jazz-is-dead.md) (the decision).

> **Update, 2026-08-30 — this is now built.** Phases 1–4 shipped: catalog,
> models and sync all run on cr-sqlite. What it turned into, and what it costs
> at scale, are documented where the code is:
> [electron/main/docs/p2p-sqlite/overview.md](../../../electron/main/docs/p2p-sqlite/overview.md)
> and [scalability.md](../../../electron/main/docs/p2p-sqlite/scalability.md).
> This study stays as the reasoning that got there; where the two disagree, the
> p2p-sqlite docs describe what exists.

---

## 1. What Jazz actually holds

Smaller than it feels. `WorkspaceCoMap` (`kernel/modules/Store/schema.ts`) has
exactly three things under it:

| Domain | Shape | Notes |
|---|---|---|
| `metadata` | `WorkspaceMetadata` | name, owner account, `syncOptIn` |
| `models` (+ `modelSummaries`) | graph JSON, documents, `EditLease` | Composer |
| `materials` | the catalog — materials, types, orgs, edges | Materials |

Everything else the app persists — layout, viewports, budgets, SVGs, markdown,
converter state, the material-type cache — is already plain JSON in
`.session/`, written by the whole-session save (repo `CLAUDE.md`) and untouched
by any of this.

**Footprint:** 66 files reference Jazz; the substance is ~4 700 lines across
`electron/main/jazz.ts` (830), `electron/preload/jazz.ts` (286),
`Store/schema.ts` (238), `Materials/main/*` (2 400) and `Composer/main/*`
(917). The rest is tests and thin call sites.

## 2. What Jazz gives us that is not storage

This is the part a storage swap does not cover, and the reason "replace Jazz
with RxDB" is not a like-for-like exchange:

1. **Identity.** Every peer is a cojson account with a keypair
   (`.account-creds.json`); every change is signed by its author.
2. **Access control.** `Group` membership decides who may read or write a
   workspace; sharing is granting `everyone → writer` and handing out a coId.
3. **A zero-knowledge relay.** The sync server "only sees opaque encrypted
   message payloads — it cannot read content, edit anything, or impersonate
   either peer" (`docs/join-workspaces.md`). Authority is the signature, not
   the server.
4. **Offline-first merge.** Concurrent edits converge without a server round
   trip; `EditLease` is an app-level nicety on top, not the correctness
   mechanism.
5. **Binary blobs** and per-workspace local SQLite persistence, free.

Neither candidate replaces (1), (2) or (3). Both replace (5). They differ on
(4): cr-sqlite keeps genuine offline convergence, RxDB gives last-write-wins
per document with a pluggable handler.

**Identity, authorization and confidentiality become ours either way. That is
the real cost of this migration, and it is not in the storage layer.**

## 3. What RxDB costs, literally — why it is *not* the recommendation

- **The SQLite RxStorage is premium.** The version shipped with RxDB core is a
  trial that "does pass the full RxDB storage test-suite, [but] is not made for
  production — use it for evaluation and prototypes only". Production SQLite
  storage requires RxDB Premium: **from $99/month billed annually** (Pro,
  unlimited developers).
- **Filesystem storage is premium too** (Pro). The free storages that run in a
  Node/Electron main process are Memory and LokiJS+filesystem, the latter
  documented as not for production and loading everything into memory at
  startup — which is precisely the failure mode we are leaving.
- **RxServer adapters are Pro Plus**, from $239/month billed annually. Without
  them the replication backend is ours to write against the documented
  protocol.

So the realistic bill is **~$1.2k/year** (Pro, hand-rolled backend) or
**~$2.9k/year** (Pro Plus, RxServer), plus the backend to run.

What that buys over §4: reactive queries (we already have Redux + IPC events),
a schema/migration system, and a documented replication protocol whose server
half we would still write. Against a free extension that leaves SQL untouched
and needs no server logic at all, it is hard to justify — hence §4.

## 4. cr-sqlite (vlcn.io) — the recommended option

An MIT-licensed **SQLite extension** that turns ordinary tables into CRDTs
(`SELECT crsql_as_crr('materials')`). Rows keep their columns and their
indexes; SQL is unchanged. Merge is **per column** — last-write-wins by
default, with counter and fractional-index CRDTs available — which is closer to
what Jazz gave us than RxDB's per-document LWW, and strictly better than what
`updateMaterial` does today.

Sync is a table: `SELECT * FROM crsql_changes WHERE db_version > ?` on one
peer, `INSERT INTO crsql_changes` on the other. No server logic — the existing
dumb WebSocket relay carries it unchanged.

**Measured**, same benchmark, CRRs enabled, prebuilt `crsqlite.so` v0.16.3
loaded into `node:sqlite`
([script](../../../scripts/devtools/catalog-crsqlite-bench.mjs)):

| | plain SQLite 10k | cr-sqlite 10k | plain 100k | cr-sqlite 100k |
|---|---|---|---|---|
| First page (100, ranked) | 0.39 ms | **0.44 ms** | 0.35 ms | **0.39 ms** |
| One row by id | 0.046 ms | 0.051 ms | 0.025 ms | 0.028 ms |
| Search → 100 hits | 4.9 ms | 6.1 ms | 44 ms | 54 ms |
| Update one row | 0.08 ms | 0.42 ms | 0.06 ms | 0.44 ms |
| Bulk write | 52k rows/s | **3.7k rows/s** | 48k rows/s | 3.6k rows/s |
| Store on disk | 13.5 MB | 23.2 MB | 137 MB | 239 MB |

**Reads are free** — within noise of plain SQLite, and still four orders of
magnitude better than Jazz. The CRDT bookkeeping is paid on writes: ~14× slower
inserts (the README claims 2.5×; measured is worse) and ~1.7× disk. Neither
matters here — a 100k import takes 28 s instead of 2 s, against 17 hours today,
and 239 MB against a projected 3 GB.

The number that *does* need designing around: `crsql_changes` holds **one row
per column per row** — 17 change rows per material, so 1.7M rows for a 100k
catalog, and reading the whole changeset took 15.7 s. Incremental sync
(`db_version > watermark`) is cheap; **bootstrapping a fresh peer should ship a
copy of the database file, not replay the changeset.**

### Risks, honestly

- **Release staleness.** Last npm publish and last tagged release are
  **v0.16.3, January 2024**. The repository is not abandoned — commits in
  August 2026 are build-matrix work (Windows arm64, Android page size, macOS
  headerpad, iOS simulator) — but consuming anything newer than 0.16.3 means
  building the extension ourselves. Prebuilt loadable extensions exist for
  linux/darwin/windows on x86_64 and aarch64, which covers our targets.
- **We would be shipping a native extension** per platform, versioned with the
  app. `better-sqlite3` (12.10.0, already a dependency) exposes `loadExtension`,
  and `node:sqlite` supports it too — verified, both work.
- **Schema constraints.** CRR tables need a `NOT NULL` primary key, and in
  practice every column wants `NOT NULL DEFAULT` (the benchmark required it).
  `ALTER TABLE` goes through `crsql_begin_alter` / `crsql_commit_alter`.
  Foreign keys are not documented as supported — the schema should not rely on
  them.
- **Still no identity, authorization or encryption** (§2). Same gap as RxDB.

## 5. Target architecture

```
Electron main
  ├── catalog.sqlite            materials, edges, orgs, types, FTS5 index
  ├── models.sqlite (or same)   model graphs, documents, summaries
  ├── outbox / change log       every local write, ordered, with a checkpoint
  └── sync client               ships `crsql_changes` rows over the WS relay
        ↕ IPC (unchanged: loadMaterialsWindow, getMaterial, listModels, …)
Renderer
  └── Redux mirror of a window  unchanged — catalog-mirror.md still holds
```

The renderer contract does not change. `loadMaterialsWindow`, `getMaterial`,
the delta ticks, the residency sweep, the pins — all of it keeps working
against a different answering engine. That is what makes this migratable in
stages instead of as a flag day.

Schema: the benchmarked shape — searchable fields promoted to columns
(`type`, `external_id`, `name`, `color`, `industry`, `usage_count`,
`updated_at`), everything else a JSON blob, FTS5 for search, an `edges` table
indexed by source. Documents and model graphs are blobs keyed by id.

Sync (cr-sqlite): each peer keeps a `db_version` watermark per remote peer,
sends `SELECT * FROM crsql_changes WHERE db_version > ? AND site_id IS NOT ?`,
and applies what it receives by inserting into `crsql_changes`. Merge is
per-column LWW, decided by the extension, so the relay stays dumb and no
conflict code is ours to write. Bootstrapping a fresh peer copies the database
file (see §4 — replaying 1.7M change rows is the wrong way to do it).

That is **stronger than the RxDB alternative** (per column rather than per
document) and close to what cojson gave us. It is still weaker than cojson in
one respect worth naming: there are no signatures, so a peer that can write to
the relay can write anything. Authority moves from the data to the transport.

## 6. Phased plan

Each phase leaves the app working. No phase is a flag day.

1. ~~**Catalog projection.**~~ **Done** (2026-08-30). Reads answered from
   SQLite; the projection carries an existing catalog across, once per
   workspace. Boot on the 2 110-material workspace: 3.7 s → 0.48 s.
2. ~~**Catalog store of record.**~~ **Done** (2026-08-30). Writes, delta ticks
   and the import path are SQLite; Jazz is read once per workspace and never
   written. The `importCatalog` e2e went from exhausting the app to passing,
   and seed → usable view at 1 000 materials went 7 333 ms → 788 ms.
   See `Materials/docs/changes/2026-08-30-609b6c-catalog-on-sqlite.md`.
3. **Models and documents.** Same move. Model graphs are blobs, so per-column
   merge does not help them — `EditLease` has to become the actual correctness
   mechanism rather than a nicety.
4. **Sync.** Ship `crsql_changes` over the existing relay, plus identity and
   authorization. The largest phase and the one with no local-only fallback —
   it is where the zero-knowledge property is either rebuilt or consciously
   given up.
5. **Removal.** Delete `electron/main/jazz.ts`, the preload surface, the
   schema, and the `jazz-tools` / `cojson` dependencies. Migrate existing
   workspaces by projecting each `jazz.sqlite` once and writing the new store
   beside it — keep the old file read-only until confidence is earned.

Phases 1–2 are worth doing **before the cr-sqlite-vs-RxDB fork is even
settled**: the tables and the queries are identical either way (cr-sqlite is an
extension over the same schema, not a different one), and they fix the problem
users actually feel. Adopt the extension at phase 3–4, when sync starts to
matter.

## 7. Risks worth naming now

- **Sync is the whole cost.** Phases 1–3 are mechanical and measurable.
  Phase 4 is a distributed-systems project with an auth surface, and it is
  where "remove Jazz" stops being a refactor.
- **Losing zero-knowledge and signed authority.** Today the relay cannot read
  workspace content and cannot forge a change. A relay shipping
  `crsql_changes` rows can do both. If those properties matter they have to be
  rebuilt on top (encrypt and sign payloads client-side), and that interacts
  badly with a merge the extension performs for us.
  **Decided 2026-08-30: dropped, knowingly.** The relay is trusted, peers
  authenticate with a shared token, and a public relay is not an option under
  this design. The full statement lives at the top of `sync/protocol.ts`.
- **A vendored native extension.** cr-sqlite ships as a loadable `.so`/`.dylib`
  /`.dll` per platform, at a version whose last release is January 2024 (§4).
  We would own the build, or pin 0.16.3 and track the repo.
- **Merge semantics** stay per-column for tabular data but do nothing for the
  model graph blobs (§6, phase 3).
- **Migration of existing workspaces** is one-way. Needs a projection tool and
  a tested rollback (keep `jazz.sqlite` read-only until confidence is earned).

## 8. Still unmeasured

- ~~**cr-sqlite under Electron's `better-sqlite3` build.**~~ Answered: it
  loads, and an in-place CRR upgrade of a populated database works (verified on
  the real 2 110-material store). The extension is fetched and packaged at
  **build** time (`scripts/devtools/fetch-crsqlite.mjs`, Forge
  `generateAssets`), never at run time — a user is not always online.
- **The cold-start cost of a Jazz catalog at 10k** is now moot for the catalog:
  nothing reads it at run time after the one-time projection. It would still be
  the number to know for `models`, which phase 3 moves.
