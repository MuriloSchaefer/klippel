# Performance test suite — options analysis

> Scope: design a repeatable performance-test suite for the Materials surface
> (and, by extension, any list/catalog viewport) that covers both **standalone**
> single-instance behavior and **collaborative** multi-peer behavior. The
> question on the table is *how we get the workspace into a known, large state*
> so the perf assertions mean something. Three options:
>
> 1. **Pre-built fixture workspaces** at several material counts, replayed under the full suite (stated preference).
> 2. **A seeding helper** that programmatically adds many materials at test time.
> 3. **A hybrid** — a script synthesizes arbitrary data into a workspace, which the suite then runs against.
>
> Source anchors: [e2e-tests.md](../quality/e2e-tests.md), [jazz-performance.md](./jazz-performance.md),
> [resetWorkspace.ts](../../helpers/puppeteer/resetWorkspace.ts),
> [seedMaterialsCatalog.ts](../../helpers/puppeteer/seedMaterialsCatalog.ts),
> [collaborativeHarness.ts](../../helpers/puppeteer/collaborativeHarness.ts),
> [Materials/main/index.ts](../../system/modules/Materials/main/index.ts),
> [Materials/main/materials.ts](../../system/modules/Materials/main/materials.ts),
> [catalog.ts](../../system/modules/Materials/typings/catalog.ts).

---

## 1. What we are actually trying to measure

A perf test is only meaningful if it pins (a) a **workload** (how much data, what shape), (b) a **surface** (which code path), and (c) a **budget** (the number we assert against). Before choosing how to build the workload, name the surfaces and budgets, because they dictate which option is viable.

### 1.1 Surfaces under test

| # | Surface | Standalone path | Collaborative path |
| --- | --- | --- | --- |
| S1 | **Cold workspace open** — catalog load → first paint of the stock grid | `workspaceSelected` → `loadMaterialsCatalog` → `jazz-materials-load` IPC → Redux → `MaterialStockViewport` render | same + initial Jazz sync pull from a peer/relay |
| S2 | **List render / re-render** — DataGrid with N rows, scroll, sort, filter | `TableView` virtualization, selector recompute | re-render on every inbound `jazz-materials:changed` tick |
| S3 | **Search/filter latency** — keystroke → filtered rows | `material-stock-search` → filter selector | n/a (local) |
| S4 | **Single mutation round-trip** — add / update / delete one material | `jazz-materials-add` → catalog mutate → `onCatalogChange` → re-render | local mutate → sync fan-out → remote peer re-render |
| S5 | **Mutation under load** — one write while N rows already live | as S4 with large `catalog.materials` record | as S4; remote convergence latency |
| S6 | **Sync convergence** — peer B reflects peer A's change | n/a | `waitForCatalogIPC` poll-to-green latency |
| S7 | **Bulk burst** — many writes in a short window (import, executor) | `materials:import-xlsx` job | fan-out / receive-validator backlog (jazz-performance F4/F10) |

S1–S5 are the day-one Materials surfaces. S6–S7 are where this suite connects to the **F1–F10 failure modes** already enumerated in [jazz-performance.md §4](./jazz-performance.md). The workload-generation option we pick has to be able to feed *all* of these, not just "render a big list."

### 1.2 Budgets (must be declared, not discovered)

Perf tests that assert "it finished" are useless; they must assert against a number. Per [e2e-tests.md §1](../quality/e2e-tests.md) a `performance` test is one with "assertions on time / memory / payload-size budgets." Candidate budgets, to be confirmed by a first calibration run:

- S1 cold-open to grid-painted: **p50 < 300 ms, p95 < 800 ms** at 1k materials.
- S2 sort/filter recompute: **< 100 ms** at 1k rows.
- S4 single add round-trip (mutate → row visible): **< 200 ms** standalone.
- S6 convergence (peer A add → peer B `load()` sees it): **p95 < 1.5 s** on the in-process sync server.

These mirror the plan's stated budgets ("metadata IPC < 200 ms," "receive-validator < 10 ms/mutation p95") referenced in [jazz-performance.md §2.3 / F2](./jazz-performance.md). The numbers are placeholders; the point is that the suite **records them as machine-readable artifacts** so we can trend them, not just pass/fail.

### 1.3 The cardinalities we want to sweep

Anchored to the 12-month target in [jazz-performance.md §1](./jazz-performance.md) (≈1,000 `ModelCoMap`/workspace, dozens of peers):

- **Material counts:** 0 (baseline), 100, 500, **1,000, 10,000, 100,000**. 1k is the 12-month design target; 10k and 100k are deliberately past it to find where the architecture breaks (cold-open, snapshot clone, sync). The order-of-magnitude jumps matter more than fine-grained steps — a cliff between 10k and 100k tells us more than 2,500 vs. 5,000.
- **Peer counts (collaborative):** 1, 2, 4, 8 (direct-peer mesh starts collapsing past ~8–10 per §2.3).
- **Type/edge fan-out:** each material has a `conformsTo` edge (see `addMaterial` in [materials.ts:617](../../system/modules/Materials/main/materials.ts#L617)), so edge count ≈ material count × (1 + industry/seller links). The seed must produce a *realistic* edge graph, not just bare material rows, or S1/S2 will be measured against an unrealistically cheap projection.

> The 10k/100k tiers change *how* we generate, store, and assert — a single
> bulk-seed IPC and a full-snapshot assertion both break at that scale. That is
> its own design problem; see **§8**.

---

## 2. Option 1 — Pre-built fixture workspaces

**Shape:** check a small set of ready-made workspace directories into the repo (or generate-once-and-commit), one per cardinality: `materials-100`, `materials-500`, `materials-1k`, `materials-2500`. Each is a full `workspaces/<name>/` tree with its `.session/` and the Jazz SQLite DB already populated. The suite points `BASE_WORKSPACE=<fixture>` and `resetWorkspace(page, '<test-ws>')` copies it into place ([resetWorkspace.ts:67-106](../../helpers/puppeteer/resetWorkspace.ts#L67)).

This is exactly the mechanism the env already supports: `resetWorkspace` does a `cpSync(baseDir, targetDir)` of a named base workspace, and `BASE_WORKSPACE` is documented as the way to "preload state" ([e2e-tests.md §7](../quality/e2e-tests.md)).

### Mechanics

- `beforeAll` → `resetWorkspace(page, 'perf-1k', /* base */ 'materials-1k')` — a directory copy, then a page reload that lands on the seeded catalog. No per-row IPC.
- The fixture is produced **once** by a generator (see Option 3) and frozen. After that, every run replays identical bytes.

### Pros

- **Deterministic and fast to set up per run.** A 1k-material workspace is a single `cpSync` + reload (S1 is literally the thing we want to measure, and it starts from real on-disk Jazz state — not a synthetic in-memory shortcut). Setup cost is constant regardless of cardinality.
- **Measures the real cold-open path (S1) honestly.** Because the data is already in the Jazz SQLite DB and `.session/`, the workspace-open path hydrates from disk exactly as production does. Option 2's "add N materials then measure" pollutes the catalog with N mutations of write history (see [jazz-performance.md §2.1](./jazz-performance.md) — the mutation log is append-only and super-linear in writes), so its DB is *not* representative of a workspace that has 1k materials but a normal edit history. **Fixtures win on fidelity for S1/S2.**
- **Stable across machines and time.** Same bytes → comparable numbers run-over-run, which is the whole point of trending a budget. A programmatic seed re-runs the seeding logic each time, so a regression in the *seeding path* can masquerade as a regression in the *measured path*.
- **Cheap to add a new cardinality** once the generator exists — generate, commit, point a test at it.

### Cons

- **Repo weight / binary churn.** A 1k-material Jazz DB with SVG blobs is non-trivial (per §1, ~1,000 SVGs, <1 MiB typical each → potentially hundreds of MiB). Committing several of these bloats the repo and every clone. *Mitigation:* commit a compact **seed manifest** (JSON/NDJSON of `SeedCatalogInput`) instead of the built DB, and have a `pretest` step materialize the workspace via the seed IPC into `~/klippel/envs/<env>/workspaces/` (not the repo). This is really Option 3 wearing Option 1's clothes — see §4.
- **Staleness / schema drift.** A frozen DB is pinned to the Jazz schema and `MaterialTypeVersionDTO.schemaJson` shape at freeze time. When the schema migrates (and [jazz-performance.md](./jazz-performance.md) anticipates lazy-hydration / `ModelSummaryCoMap` work), the fixture must be regenerated or it tests a dead shape. A committed binary fixture rots silently; a manifest + generator regenerates against current code.
- **Opaque.** A reviewer cannot read a `.sqlite` in a diff. Bugs in the fixture (e.g., dangling `conformsTo` edges) are invisible until a test fails weirdly.
- **Collaborative fit is awkward.** The collaborative harness ([collaborativeHarness.ts](../../helpers/puppeteer/collaborativeHarness.ts)) spins **fresh isolated env dirs per peer** and joins them by coId over a sync server. A pre-built workspace would have to be (a) placed in peer A's env, (b) *shared*, and (c) *synced* to peer B at test time — and that initial-sync-of-1k-materials *is itself one of the things we want to measure* (S6 cold sync). So for collaborative, a pre-seeded peer A is useful, but you cannot pre-bake "both peers already converged"; convergence has to happen live.

### Where it shines

Standalone S1/S2/S3 at fixed large cardinalities, run frequently, trended over time. This is the **gold-standard for render/open budgets** because the on-disk state is real and identical every run.

---

## 3. Option 2 — Programmatic seeding helper

**Shape:** a helper, e.g. `seedSyntheticMaterials(page, { count, types, withEdges })`, that drives the existing `jazz-materials-seed` IPC ([Materials/main/index.ts:98](../../system/modules/Materials/main/index.ts#L98) → `seedCatalogIfEmpty` at [materials.ts:583](../../system/modules/Materials/main/materials.ts#L583)) with a generated `SeedCatalogInput`. We already have the primitive: `seedCatalogIfEmpty` bulk-sets `materials`, `materialTypes`, `industries`, `sellers`, and `edges` in one IPC call, only if the catalog is empty.

Note the difference from `addMaterial`: `seedCatalogIfEmpty` is a **single bulk mutation** that writes the whole record set, whereas N× `addMaterial` is N round-trips each creating a material + a `conformsTo` edge. For perf seeding we want the bulk path — it's faster and, crucially, it doesn't fabricate N separate edit histories the way per-call adds do.

### Mechanics

- A pure generator builds `SeedCatalogInput` from the DTOs in [catalog.ts](../../system/modules/Materials/typings/catalog.ts): N `MaterialDTO` (each with `attributes`, `stock`, `schemaVersion`), a handful of `MaterialTypeVersionDTO`, some `OrgNodeDTO` industries/sellers, and the `conformsTo` / `manufacturedBy` edges.
- `beforeAll` → `resetWorkspace(page, 'perf-seed')` (empty) → `page.evaluate(() => window.electron.jazz.materials.seed(input))`.
- The generator is seeded with a fixed PRNG seed so the data is reproducible across runs without committing bytes.

### Pros

- **No repo weight, no binary fixtures.** The data is code. A diff shows exactly what changed in the generator.
- **Parametric.** One helper sweeps every cardinality in §1.3 by argument. Adding "2,500 materials with deep nested `composition` attributes" is a function call, not a new committed DB.
- **No schema staleness.** It builds DTOs against the *current* type definitions; a schema change is a compile error in the generator, which is exactly the feedback we want.
- **Reuses an existing, production-adjacent path.** `seedCatalogIfEmpty` is real main-process code; exercising it also gives us incidental coverage of the bulk-write path.
- **Collaborative-native.** In the multi-peer harness you seed **peer A** via its IPC, then measure live convergence to peer B (S6) — which is the realistic collaborative scenario and impossible to pre-bake. This is the option's biggest edge over Option 1 for collaborative tests.

### Cons

- **Seeding cost is paid every run and is on the critical path of `beforeAll`.** At 2,500 materials the bulk set + Jazz CoValue creation (`createMaterialCoValue` per row in [materials.ts:604](../../system/modules/Materials/main/materials.ts#L604)) is real work. It's a fixed per-run tax, and if seeding is slow it lengthens every CI run. *Mitigation:* seed once into a base env workspace and `cpSync` from there — again converging toward Option 3.
- **Contaminates the very metric for S1.** The freshly-seeded catalog's Jazz DB reflects *one big bulk write*, not a workspace that organically grew to 1k materials over months of edits. For pure render/open budgets that's arguably *cleaner* (no history bloat), but it means Option 2 cannot reproduce the **history-bloat failure modes** (F1 WAL bloat, F8 hot-model history) — those need many real mutations, not one bulk seed. So Option 2 covers S1–S6 but is blind to F1/F8/F9.
- **`seedCatalogIfEmpty` only fires when the catalog is empty** (by design — [materials.ts:587](../../system/modules/Materials/main/materials.ts#L587)). Re-seeding a non-empty workspace silently no-ops (`{ seeded: false }`). The helper must assert `seeded === true` and run against a freshly-reset (empty) workspace, or it will measure against stale data. This is a real footgun that needs a guard.
- **Realism of synthetic data.** Random attributes/SVGs may not stress the same code paths as production data (e.g., a real `graphJson` / SVG blob is what makes S1 expensive per [jazz-performance.md §2.1](./jazz-performance.md)). The generator must include representative blob sizes and nested `composition`/`caracteristics` maps, or it under-measures.

### Where it shines

Collaborative convergence (S6), parametric sweeps, and any test where the workload shape changes per case. It's the most flexible and the most maintainable, at the cost of paying setup time every run and being blind to history-driven failure modes.

---

## 4. Option 3 — Hybrid: generator script → materialized workspace → suite

**Shape:** the synthesis logic of Option 2 and the replay-fidelity of Option 1, split across a build step and the test run.

1. A **generator** (a node script, or a `--seed-only` test invocation) produces a workspace **once per cardinality** by driving `seedCatalogIfEmpty` (and, for history-bloat cases, a *configurable number of real `addMaterial`/`updateMaterial` mutations* so the WAL and per-CoValue history are representative).
2. The materialized workspaces live under `~/klippel/envs/<perf-env>/workspaces/` (out of the repo); only the **compact seed manifest** (NDJSON of the `SeedCatalogInput` + a mutation script) is committed.
3. The suite runs Option-1-style: `BASE_WORKSPACE=materials-1k` → `resetWorkspace` `cpSync` → measure. Setup per run is a directory copy, not a re-seed.
4. A `pretest:perf` / CI cache step regenerates the workspaces from the committed manifest if they're missing or the manifest hash changed.

This is the standard "fixtures are generated, not committed; the recipe is committed" pattern.

### Pros

- **Best fidelity + best per-run speed.** Real on-disk Jazz state (Option 1's S1/S2 honesty) with a fast `cpSync` setup, *and* the ability to bake in real mutation history for F1/F8/F9 (which Option 2's single bulk seed cannot).
- **No binary churn, no staleness.** The committed artifact is a human-readable manifest + generator; regeneration is a command. Schema drift surfaces as a generator compile error, and the regenerate step refreshes the bytes.
- **One generator feeds both worlds.** Standalone tests consume the materialized fixture; collaborative tests reuse the *same generator* to seed peer A live, then measure convergence. The data shape is identical across standalone and collaborative, so their numbers are comparable.
- **Sweep-friendly.** Cardinalities are generator parameters; "regenerate all fixtures" is one script with a loop over §1.3's counts.
- **Cache-friendly in CI.** Materialized workspaces key on the manifest hash, so they're built once and cached across runs.

### Cons

- **Most upfront engineering.** Three moving parts: the generator, the manifest format + hash/cache logic, and the `pretest` materialization step. Options 1 and 2 are each a single helper.
- **Two-stage failure surface.** A green suite now depends on the generator *and* the cache-invalidation logic being correct. A stale cache (manifest changed but fixture not rebuilt) silently measures old data — needs a hash guard that *fails loudly* on mismatch.
- **Determinism discipline.** The generator must be PRNG-seeded and the mutation script must be deterministic, or "regenerate" produces different bytes each time and the cache thrashes. Manageable but a real constraint.

### Where it shines

This is the only option that covers the **full matrix** in §1.1 (S1–S7) *and* the history-driven failure modes F1/F8/F9, while keeping per-run setup to a `cpSync`. It is the natural end-state once the suite outgrows a single cardinality.

---

## 5. Side-by-side

| Criterion | Opt 1 Fixtures | Opt 2 Seeding helper | Opt 3 Hybrid |
| --- | --- | --- | --- |
| Per-run setup speed | `cpSync` (fast, constant) | re-seed every run (scales with N) | `cpSync` (fast, constant) |
| S1 cold-open fidelity | **high** (real disk state) | medium (bulk-write history only) | **high** |
| History-bloat modes (F1/F8/F9) | yes if baked in | **no** (single bulk seed) | **yes** (scripted mutations) |
| Collaborative convergence (S6) | awkward (can't pre-converge) | **native** (seed A, sync to B) | **native** (reuses generator) |
| Parametric sweeps (§1.3) | one fixture per count (manual) | **trivial** (argument) | **trivial** (generator param) |
| Repo weight | **heavy** if DB committed | **none** | **none** (manifest only) |
| Schema-drift resistance | poor (frozen bytes) | **good** (builds current DTOs) | **good** |
| Diff reviewability | poor (binary) | **good** (code) | **good** (manifest + code) |
| Upfront effort | low–medium | low | **high** |
| Maintenance | regenerate on drift | low | medium (cache logic) |

---

## 6. Recommendation

**Build Option 2's generator first; grow it into Option 3. Treat "pure Option 1" (committed binary DBs) as an anti-pattern to avoid.**

Rationale:

1. **The generator is the shared core of both viable options.** Whether you `cpSync` a materialized fixture (Opt 1/3) or seed live (Opt 2), you need one deterministic, PRNG-seeded `SeedCatalogInput` generator built against [catalog.ts](../../system/modules/Materials/typings/catalog.ts). Write that once. It is reusable, reviewable, and schema-current.

2. **Collaborative tests force Option 2's live-seed path anyway.** You cannot pre-bake "two peers already converged"; the [collaborativeHarness](../../helpers/puppeteer/collaborativeHarness.ts) joins fresh peers over a live sync server, and cold convergence (S6) is a thing we want to measure. So the live-seed helper is non-optional — build it regardless.

3. **Standalone render/open budgets (S1/S2) want fixture fidelity and fast setup**, which is Option 3's `cpSync`-from-materialized-base. Get there by adding a thin materialization step (`pretest:perf` seeds once into a base env workspace; tests `cpSync` from it), keyed on a manifest hash. Do **not** commit the built `.sqlite` — commit the manifest.

4. **History-driven failure modes (F1/F8/F9) need scripted real mutations**, which only Option 3 covers. Defer these until the basic S1–S6 budgets are green; they belong under `tests/<scope>/performance/` per [e2e-tests.md §1](../quality/e2e-tests.md) but are a second phase.

### Concrete first steps

1. `webapp/src/helpers/puppeteer/generateMaterialsCatalog.ts` — pure, PRNG-seeded `(opts) => SeedCatalogInput`. Produces materials + types + industries/sellers + a realistic `conformsTo`/`manufacturedBy` edge graph and representative blob/`composition` sizes. No `page` dependency (testable in isolation).
2. `seedSyntheticMaterials(page, opts)` — drives `window.electron.jazz.materials.seed(generate(opts))`, asserts `seeded === true`, and waits for the grid to reflect the row count via a `data-*` count mirror (add one to `MaterialStockViewport`/`SummaryBar` if absent — per [e2e-tests.md §2](../quality/e2e-tests.md), express the wait as a selector, not a `waitForFunction` poll).
3. **Standalone perf tests** under `Materials/tests/standalone/performance/`:
   - `catalogColdOpen.e2e.test.ts` — sweep [100, 500, 1k] via `seedSyntheticMaterials`, measure S1 with `performance_start_trace` / `performance.now()` marks, assert §1.2 budgets, emit a machine-readable artifact.
   - `listInteraction.e2e.test.ts` — sort/filter/search latency (S2/S3) at 1k.
4. **Collaborative perf tests** under `Materials/tests/collaborative/performance/`:
   - `catalogConvergence.e2e.test.ts` — `spawnCollaborativePeers({ count: 2 })`, seed peer A, measure `waitForCatalogIPC`-to-green on peer B (S6); parameterize peer count [2, 4, 8] to find the mesh cliff flagged in [jazz-performance.md §2.3](./jazz-performance.md).
5. **Materialization step (Option 3 upgrade)** — once a cardinality is run often, add a `pretest:perf` that seeds it once into a `BASE_WORKSPACE` env and switch the standalone tests to `cpSync` from it; key the build on a manifest hash that fails loudly on mismatch.
6. **Phase 2 — history-bloat (F1/F8/F9)** — extend the generator with a deterministic mutation script (N× `addMaterial`/`updateMaterial`) to produce representative WAL/history, then add `kill -9` / restart-time assertions.

### Budget-recording convention

Every perf `it` should append `{ surface, cardinality, peers, metric, value, p50, p95 }` to a JSON artifact under `webapp/.tests-executions/` (sibling to the existing run logs) so numbers are **trended**, not just asserted. A pass/fail with no recorded number can't tell you the system is slowly degrading inside budget.

---

## 8. Scaling to 1k / 10k / 100k, and how tests address the data

Two distinct problems hide inside "just make it bigger": **(A)** the seed/storage path that works at 1k does not survive 100k, and **(B)** once the catalog is huge and synthetic, a test has to know *which* material/type to search for, edit, or assert on without scanning the haystack. They are independent and both must be solved.

### 8.1 Problem A — generation & storage change per tier

The 1k → 100k jump breaks three things in the current code paths:

- **The bulk-seed IPC is a single call that loops `$jazz.set` per row** ([materials.ts:595-609](../../system/modules/Materials/main/materials.ts#L595)). At 100k that is 100k CoValue creations plus a 100k-entry structured-clone across the renderer↔main boundary in one synchronous-ish handler — it blocks the main process for a long time and risks OOM. Fine at 1k, borderline at 10k, **infeasible at 100k**.
- **`jazz-materials-load` structured-clones the *entire* snapshot on every load** ([Materials/main/index.ts:49-91](../../system/modules/Materials/main/index.ts#L49)). That is O(N) per call, and it is exactly what the collaborative `waitForCatalogIPC` poll invokes. At 100k the **measurement harness itself becomes the dominant cost** — you would be timing the clone, not the surface.
- **`requireCatalog` deep-resolves the catalog record** — [jazz-performance.md §2.2](./jazz-performance.md) already flags this as "~2× the design budget on every IPC round-trip" at 1k. At 100k every IPC that touches the catalog is pathological.

The plan already names the escape hatch: [jazz-performance.md F2](./jazz-performance.md) prescribes seeding large counts **via direct SQLite**, bypassing the renderer/IPC entirely. So the tiering is:

| Tier | Generate | Store | Per-run setup | Assertion path |
| --- | --- | --- | --- | --- |
| **1k** | live `seed` IPC (one call) | live, or materialize + `cpSync` | seed (~ok) or copy | full `load()` snapshot ok |
| **10k** | **batched** seed (chunked IPC, e.g. 1k/chunk with yields) or direct-SQLite | materialize once → `cpSync` | copy | targeted by-id lookup; full snapshot getting heavy |
| **100k** | **direct-SQLite, out of band** (single bulk IPC infeasible) | materialize once → `cpSync`, **hash-keyed cache** | copy | **must** use by-id lookup + count mirror; full `load()` is itself O(N) |

Consequences:

1. **At ≥10k you are forced into Option 3** (§4): materialize once, `cpSync` per run. Live-seeding cannot carry 100k, and re-seeding every run would dwarf the test. The per-run setup stays a constant-ish directory copy regardless of tier.
2. **Never commit the built 100k DB.** It is hundreds of MiB (SVG blobs per §1). Commit the **manifest + generator + a content hash**; a `pretest:perf` step builds/caches the workspace out-of-repo and rebuilds only when the hash changes (failing loudly on a stale cache).
3. **Generation cost is paid once and is acceptable** precisely because it is amortized across every run via the cache. The slow part (writing 100k CoValues / rows) happens at fixture-build time, not in `beforeAll`.

### 8.2 Problem B — how a test names the needle in the haystack

The rule: **a test must never *discover* a target by scanning the catalog — it must *derive* the target a priori from the same deterministic scheme the generator used.** Three mechanisms, in order of preference:

1. **Deterministic, index-derived identities.** The generator is PRNG-seeded, so it is fully reproducible, but identities are *not* random — they are functions of the row index:
   - material `i` → `id = mat-{seed}-{i}`, `label = "Material {i}"`
   - type for row `i` → `type-{i % T}@0.0.1`
   - human-looking names come from a small fixed dictionary cycled by index (`["malha","linha","tecido",…][i % dict.length]`) so names are *realistic and derivable at once*.

   A test that wants "a material that exists" computes `mat-{seed}-0`; one that wants a mid-list row computes `mat-{seed}-{count/2}`. **No lookup, no scan, no flakiness.**

2. **Planted probe rows.** Inject a handful of known, uniquely-labeled needles — `__probe_search__`, `__probe_edit__`, `__probe_delete__` — into the bulk. Search/edit/delete tests target *those*: their labels are unique by construction (the dictionary never emits `__probe_*`), known a priori, and independent of whatever random bulk surrounds them. This is what makes an S3 search test deterministic at 100k: search for `__probe_search__`, assert exactly one row.

3. **A committed catalog-index sidecar.** Alongside the manifest, the generator emits a tiny table-of-contents: `{ seed, count, types: string[], probes: { search, edit, delete }, firstId, lastId, sampleIds: [...] }`. Tests read *this* (a few hundred bytes) to learn what is in the fixture, instead of querying the 100k-row catalog. It decouples the test from the bulk and survives a regeneration as long as the scheme is stable.

### 8.3 The assertion path must also be O(1), not O(N)

Deriving the target id is half the answer; *verifying* it without paying O(N) is the other half. Today the only read paths are the full-snapshot `load()` ([preload/jazz.ts:130](../../../electron/preload/jazz.ts#L130)) and the renderer Redux/DOM — both O(N) at 100k. Two fixes:

- **Add a by-id lookup IPC** — `materials.get(id)` resolving a single `MaterialCoMap` — so a test asserts "row `mat-{seed}-500` has stock X" in O(1). This also benefits production (it is the lazy-`loadModel` pattern [jazz-performance.md §2.2](./jazz-performance.md) already recommends). Until it exists, the collaborative convergence test (S6) cannot scale past the tier where a full `load()` is affordable.
- **Lean on the DataGrid count mirror** (the `data-*` row-count attribute on `SummaryBar`/`MaterialStockViewport` already called for in §6 step 2). "Catalog reached N rows" is a single selector wait, not a snapshot scan — the right primitive for S1/S5 setup-complete waits at any scale.

### 8.4 Net effect on the recommendation

§6 stands, with these scale-driven sharpenings:

- The generator (§6 step 1) **must** emit deterministic index-derived ids + planted probes + an index sidecar from day one — retrofitting addressability after tests assume random data is painful.
- A **direct-SQLite (or chunked-batch) builder** is required for the 10k/100k tiers; the live `seed` IPC is the 1k-and-below path only.
- A **by-id lookup IPC** is a prerequisite for collaborative tests above ~10k and is worth adding early.

---

## 9. What this analysis does not decide

- **The exact budget numbers** (§1.2 are placeholders) — set them from a first calibration run on reference hardware, and note the hardware in the artifact.
- **Relay vs. direct-peer for the >8-peer collaborative sweep** — [jazz-performance.md §2.3](./jazz-performance.md) says direct mesh collapses past ~8–10; the in-process `cojson sync --in-memory` server the harness already spawns is a star topology, so it sidesteps the WebRTC mesh. Whether we *also* test the real mesh is a separate question.
- **CI display server** — perf e2e needs the `test:e2e:headless` (`KLIPPEL_USE_XVFB=1`) path per [e2e-tests.md §7](../quality/e2e-tests.md); whether perf numbers under Xvfb are representative of real GPU-accelerated renders is a calibration caveat to record, not a blocker.
