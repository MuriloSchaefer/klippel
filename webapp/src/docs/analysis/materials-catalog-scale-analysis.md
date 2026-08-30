# Materials catalog: what stands between us and 100k materials

**Date:** 2026-08-29
**Scope:** `system/modules/Materials/main` (the Jazz access layer), the xlsx
importer, and the CoValue shape materials are stored in
**Status:** Fix 2 landed 2026-08-30 (with a variant of Fix 1); Fixes 3 and 4
open. See §4 and
`system/modules/Materials/docs/changes/2026-08-30-ea4277-catalog-off-the-boot-path.md`.

Follow-on to
[materials-catalog-lag-analysis.md](./materials-catalog-lag-analysis.md)
(F1–F8, landed 2026-08-10). That work fixed the **renderer**. This one is about
**main**, and it picks up the three items that analysis explicitly left open:
the unmeasured windowed read, the still-deep `materialsCatalogResolve`, and
"how many materials does the real workspace hold?".

---

## Summary

Every materials IPC entry point calls `requireCatalog()`, and `requireCatalog()`
issues a **fresh deep load of the entire catalog** — every material, every one
of its attribute CoValues, every edge — before doing its own work. It is not
cached, and it is not scoped to what the caller needs.

The consequence is a **fixed per-call cost proportional to catalog size, and
independent of the request**. Measured on the live `demo/pessoal` workspace at
1 454 materials:

| Call | Median |
|---|---|
| `get(id)` — **one** material | 927 ms |
| `loadWindow` — page of **1** | 915 ms |
| `loadWindow` — page of **100** | 888 ms |
| `loadWindow` — page of **500** | 972 ms |
| `loadWindow` — page of 100, with search | 921 ms |

Reading one row costs the same as reading five hundred, and searching costs the
same as browsing, because none of that is where the time goes. The windowing,
ranking and search-index work F1–F8 built is *already fast* — it is sitting
behind a ~900 ms constant that grows with the catalog.

The same constant is paid per write, which is why bulk import crawls:
**1.6 materials/s** sustained (~625 ms/row), measured during a real 5 680-row
import. At that rate 100k materials is ~17 hours of wall clock.

The second, deeper problem is storage shape: a material is not one CoValue, it
is **~19**. That is what makes the deep resolve expensive in the first place.

**Neither problem is in the renderer, and neither is addressed by the F1–F8
fixes.** The good news is that the first one has a single chokepoint.

---

## 1. Measurements

Live app, `demo/workspaces/pessoal`, dev build, during and after a real catalog
import. Catalog grew 437 → 1 454 materials during the session.

### 1.1 Store

```
jazz.sqlite            70 MB
coValues               27 989
transactions           38 109
sessions               29 469
```

**27 989 CoValues / 1 454 materials = 19.2 CoValues per material.**

Storage grew ~31 MB while 1 017 materials were added — **~30 KB per material**,
inclusive of transaction and session overhead.

### 1.2 Read latency

Table above. The flat profile across `limit=1 / 100 / 500` is the finding: the
cost is not in the answer.

### 1.3 Write throughput

Measured over a 47 s window mid-import, catalog at ~1 400 rows:

```
465 - 390 = 75 rows / 47 s  =  1.6 rows/s  ≈  625 ms per material
```

625 ms/row against a ~900 ms whole-catalog resolve is consistent: the write
itself is cheap, the resolve preceding it is not.

### 1.4 Stability

The app (main process included, not just the renderer) died during sustained
import at roughly 1 450 materials. I was concurrently polling the
whole-catalog `materials:load` IPC to count progress, so this is **two
whole-catalog deep resolves competing**, not import alone; I could not confirm
an OOM kill from the kernel log. Treat this as "the current shape has no
headroom at ~1.5k under concurrent full loads", not as a precise ceiling.

Worth noting on its own: `api.load()` — the whole-catalog IPC — is still
reachable and still does exactly what F1/F2 removed from the *user* paths. It is
documented as the perf-harness path (invariant 8.1), and it behaved like one.

---

## 2. Root cause: `requireCatalog` deep-resolves everything, every time

`main/materials.ts:273`. Every call does:

```ts
const settled = await MaterialCatalogCoMap.load(materialsRef.id, {
  resolve: materialsCatalogResolve,   // ← the deep shape
});
```

and `materialsCatalogResolve` (line 167) walks, for **every material in the
catalog**: `stock`, `position`, `attributes.$each`, `composition.$each`,
`caracteristics.$each` — plus every entry of `materialTypes`, `industries`,
`sellers` and `edges`.

There is **no cache**. Note the asymmetry: the *workspace* handle is cached
(`requireActiveWorkspaceHandle`, and the comment at line 281 explains the
consequences of that caching), but the catalog it points at is re-resolved from
scratch on every single call.

### 2.1 Eleven call sites, one shape

`grep -n "await requireCatalog()"` returns 11 hits — **every** IPC entry point:

| Line | Function | Actually needs |
|---|---|---|
| 535 | `loadMaterialsCatalog` | everything (legitimately) |
| 728 | `computeCatalogDelta` | content of changed rows |
| 891 | `getMaterial` | content of **one** row |
| 1090 | `loadMaterialsWindow` | content of **one page** |
| 1361 | `seedCatalogIfEmpty` | container maps only |
| 1411 | `appendCatalogChunk` | container maps only |
| 1447 | `addMaterial` | container maps only |
| 1544 | `updateMaterialStock` | one row |
| 1558 | `updateMaterial` | one row |
| 1702 | `deleteMaterial` | container maps only |
| 1718 | `registerMaterialTypeVersion` | `materialTypes` only |

Nine of the eleven need a small fraction of what they are handed. `addMaterial`
is the clearest case: it deep-loads every attribute of every existing material
in order to check `catalog.materials[id]` for existence and then `$jazz.set`
three or four new CoValues into container maps.

This is precisely the item the previous analysis parked:

> `materialsCatalogResolve` is still the deep whole-catalog shape. […]
> Shrinking it is the next real win in main, and windowing is what makes it
> possible: nothing now needs the whole graph resolved at once.

The numbers above are the evidence for that call, plus one dimension it did not
consider: the **write** path pays it too, per row.

### 2.2 Why the importer is quadratic

`main/importer/index.ts:137-165` loops `catalogAddMaterial(input)` per row.
Each call re-resolves the whole catalog, which by then includes the rows the
same loop just added. Importing N rows costs **O(N²)** deep-resolve work —
observable as an import that starts brisk and degrades.

The chunking there (`CHUNK_SIZE = 25` with a `setImmediate` yield) keeps the
event loop responsive but does nothing about the per-row resolve; it yields
between chunks, not within the cost.

---

## 3. The deeper ceiling: ~19 CoValues per material

`createMaterialCoValue` (line 1282) builds, per material:

- 1 `MaterialCoMap`
- 1 `NodePosition`
- 1 `StockCoMap`
- 1 `AttributeRecord` — **plus one CoMap per attribute key**
  (`attributeMapToRecord`, line 419, calls `attributeDtoToCoMap` per entry)
- optionally 1 `AttributeRecord` + per-key CoMaps for `composition`
- optionally the same for `caracteristics`
- 1 `conformsTo` edge, + `manufacturedBy`, + one `suppliedBy` per seller

A Duo row with 12 attributes: 1 + 1 + 1 + (1 + 12) + 3 edges = **19**. Matches
the measured 19.2 exactly.

Two consequences:

1. **The deep resolve is 19× bigger than the material count suggests.** At
   1 454 materials it walks ~28k CoValues. This is *why* §2 costs 900 ms.
2. **Storage scales at ~30 KB/material.** Projected to 100k: ~1.9M CoValues and
   ~3 GB on disk, before considering that every one of those CoValues carries
   its own transaction and session rows.

Storing attributes as one JSON-valued field (or one CoMap of plain values)
rather than a CoValue per key would cut the CoValue count per material from ~19
to ~4. That is a schema migration, not a refactor — but it is the difference
between 100k being expensive and 100k being impossible.

---

## 4. What to do, in order of leverage

> **Landed 2026-08-30 — Fix 2, plus the in-flight half of Fix 1.** Cold open on
> this workspace went from 24.2 s to 3.7 s; the first window read from 12.0 s to
> 3.3 s, and every later one to 0.15 s. The open question below ("does a cached
> handle observe later writes") was sidestepped rather than answered: only the
> *in-flight* resolve is shared, never a settled handle. A settled handle turned
> out to be worth little anyway — repeating a resolve against a warm cojson node
> costs 147 ms. Fixes 3 and 4 stand as written.

### Fix 1 — cache the resolved catalog handle *(highest leverage, smallest change)*

Hold the resolved `MaterialCatalogCoMap` in a module-level variable, and
invalidate it exactly where `invalidateCatalogIndex()` is already invalidated —
`notifyCatalogChange()` (line 208) and `dropCatalogSubscription()` (line 249).
Those two functions already own "the catalog moved" and "the catalog is gone";
the handle has the same lifetime as the index that sits beside it.

Expected: the ~900 ms constant becomes a first-call cost, and every subsequent
read is the windowing work alone — which the F1–F8 numbers say is tens of ms.

Caveat that must be checked, not assumed: whether a cached handle observes
subsequent `$jazz.set` writes without a reload. If it does not, this fix helps
reads only, and the write path needs Fix 2 regardless.

### Fix 2 — resolve by need, not one shape for all

Introduce a shallow write-shape (container maps, `$each` **not** deep) and use
it for the nine call sites in §2.1 that never touch attribute content. Keep
`materialsCatalogResolve` for `loadMaterialsCatalog` and `computeCatalogDelta`;
let `getMaterial` / `loadMaterialsWindow` resolve content **per returned row**,
which is what windowing was built to make possible.

This is the change the previous analysis named. §2.1 is the map of where to
apply it.

### Fix 3 — give the importer a bulk path

`appendCatalogChunk` already writes N materials against **one** `requireCatalog`.
It is currently fenced off as perf-fixture-only (invariant §7). Either
productize it for the importer or give `addMaterial` an batched sibling. With
Fix 1 or Fix 2 in place this matters less, but a per-row whole-catalog
round-trip is the wrong shape for an importer regardless.

While there: the 20 MB `MAX_BYTES` cap and the 50k `MAX_MATERIALS` cap are the
current hard ceiling on a single import. 100k materials cannot be imported in
one file today.

### Fix 4 — shrink the CoValue-per-material factor

§3. Biggest win, biggest blast radius, needs a migration path for existing
workspaces. Should be decided *after* Fixes 1–3, because those change what the
19× actually costs.

---

## 5. What this does **not** blame

To keep the next reader from re-litigating settled ground:

- **The renderer mirror is behaving.** At 1 454 materials the stock grid showed
  `total=1454, view=100, resident=100`. The invariant in
  [catalog-mirror.md](../../system/modules/Materials/docs/architecture/catalog-mirror.md)
  holds; residency, pins and placeholders are doing their job.
- **Search is not the problem.** Searching costs the same as not searching
  (921 ms vs 888 ms) — i.e. the main-side index is essentially free, exactly as
  F7 intended.
- **Page size is not the problem.** `limit=500` costs the same as `limit=1`.

---

## 6. How to verify a fix

The prerequisite the previous analysis named is still the prerequisite: the perf
budgets in `catalogRender.e2e.test.ts` were calibrated against a surface that no
longer exists, and the 10k/100k tiers are still unseedable
(`seedSyntheticMaterials` caps at `LIVE_SEED_MAX`).

Given §2, the seeding blocker and the runtime problem are now known to be **the
same bug**: seeding is slow because writes deep-resolve. Fix 1/2/3 should make
the 10k tier seedable through the ordinary path, at which point the
materialize-once + `cpSync` base from e2e-tests.md §11.2 may not be needed for
10k at all.

Suggested regression guards:

- A budget asserting `get(id)` latency is **independent of catalog size** —
  that is the property being restored, and it is the one that failed here.
- A budget on import throughput (rows/s) at 1k and 10k, asserting it does not
  degrade with catalog size. Quadratic behaviour shows up as a ratio, not an
  absolute.
- Extend `catalogWindowing.e2e.test.ts` past 1k once seeding allows.

See the [performance-tests](../../../.claude/skills/performance-tests/SKILL.md)
skill for tiering and budget-recording rules.

---

## 7. Open questions

- Does a cached Jazz CoValue handle observe later writes made through it? Fix 1
  depends on the answer.
- Is the ~1.5k stability limit in §1.4 really about the concurrent full loads,
  or is there a leak? Worth one deliberate reproduction with the full-catalog
  IPC left alone.
- The catalog graph is persisted to `.session/Graph/graphs/` on every session
  save (catalog-mirror.md §6 flags it). At 100k mirrored rows that write wants
  measuring — it was bounded by the mirror, which is still true, but the
  mirror's bound has never been exercised at this scale.
