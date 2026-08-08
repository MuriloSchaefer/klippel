---
name: performance-tests
description: Use when authoring, scaling, or reviewing Klippel performance e2e tests — tests under `<module>/tests/<scope>/performance/` that assert time/memory/payload budgets, or anything involving large synthetic catalogs (1k/10k/100k materials), the materials seed/generator helpers, cardinality tiers, or budget-recording artifacts. Triggers include "write a perf test", "seed a large catalog", "add a cardinality tier", "10k/100k materials", "measure cold-open / sync convergence", "why is the seed slow", "add a budget assertion", and any change under `webapp/src/helpers/puppeteer/generateMaterialsCatalog.ts` / `seedSyntheticMaterials.ts`.
---

# Klippel performance test rules

Performance tests are a subtype of e2e tests. **Read [webapp/src/docs/quality/e2e-tests.md](../../../webapp/src/docs/quality/e2e-tests.md) Section 11 first** — it is the normative source. The deep rationale (why hybrid fixtures, why deterministic ids, where the architecture breaks at scale) is [webapp/src/docs/analysis/performance-tests.md](../../../webapp/src/docs/analysis/performance-tests.md).

This skill is a pointer + decision aid. The canon is the doc.

## How to apply this skill

1. **Open Section 11 of `e2e-tests.md` and skim the analysis doc.** Do not work from memory — the seeding path and assertion path differ by cardinality tier, and getting that wrong makes the harness measure itself instead of the surface.
2. **Every perf `it` asserts a named numeric budget** and appends a record to `webapp/.tests-executions/` (`{ surface, cardinality, peers, metric, value, p50, p95, hardware }`). No budget → not a perf test.
3. **Pick the seeding path by tier** (§11.2): live `seed` IPC ≤ 1k; materialize-once + `cpSync` for 10k; direct-SQLite-out-of-band + hash-keyed cache for 100k. Never re-seed 100k per run.
4. **Address data deterministically** (§11.3): derive `mat-{seed}-{i}` / planted probes / the index sidecar — never scan the catalog to find a target.
5. **Keep assertions O(1)** (§11.4): by-id lookup IPC + DataGrid count mirror, not the full-snapshot `load()`.

## Decision tree — which tier am I in?

- **≤ 1k materials** → live `seed` IPC in `beforeAll` is fine; full-snapshot `load()` assertions acceptable. Use `seedSyntheticMaterials(page, { count })`.
- **10k** → single bulk IPC is borderline. Materialize the base once (`pretest:perf`), `cpSync` per run, assert via by-id lookup. Add the by-id IPC if missing.
- **100k** → single bulk IPC is **infeasible** (blocks/OOMs main; `jazz-materials-load` clone is O(N)). Build the base via **direct SQLite** out of band, cache it keyed on the manifest hash, `cpSync` per run. Assert only via by-id lookup + count mirror.

## Hard rules (quick reference; full text in §11)

- Folder: `<module>/tests/<scope>/performance/`. One file, one surface.
- Inherits every e2e rule: no fixed timeouts, `data-*` mirrors for waits, `resetWorkspace`/`resetUIState` isolation.
- Commit the **manifest + generator + content hash**, never the built workspace bytes.
- **Know which surfaces actually touch disk.** For slices persisted as session JSON, `.session/` is written only by the whole-session save (§12) — so `create` / `add` / `delete` measure state + render, *not* I/O. Measure the save as its own surface, driven through the UI with `saveSessionViaUI`, and say in the file header which surfaces are I/O. A perf test that assumes a mutation persisted is measuring the wrong thing.
- Out-of-band seeding (writing `.session/` files directly from node) is fixture construction and stays allowed — it belongs in `helpers/puppeteer/`, never in production code.
- Generator (`generateMaterialsCatalog.ts`) is pure + PRNG-seeded and emits index-derived ids, planted probes, the index sidecar, and a realistic edge graph. No `page` dependency.
- `seedSyntheticMaterials.ts` is the only seeding entry point a perf test calls; it asserts `seeded === true` and waits on the count mirror.

## Prerequisites that may not exist yet

These are called for in the plan; check before writing a test and add them if missing:

- `webapp/src/helpers/puppeteer/generateMaterialsCatalog.ts` (pure generator).
- `webapp/src/helpers/puppeteer/seedSyntheticMaterials.ts` (tier-aware seed helper).
- A by-id materials lookup IPC (`materials.get(id)`) — required before any > 10k test.
- A DataGrid row-count mirror (`data-*`) on `SummaryBar` / `MaterialStockViewport`.

## When to update the doc

New tier, new failure mode, or a new shared primitive → update `e2e-tests.md` Section 11 (and the analysis doc if the trade-off itself shifts) in the same PR. The skill is a pointer; the doc is canon.

## Related

- [e2e-test-rules](../e2e-test-rules/SKILL.md) — the base e2e rules every perf test also follows.
- [debug-traces](../debug-traces/SKILL.md) — for diagnosing *why* a measured render is slow once a budget fails.
