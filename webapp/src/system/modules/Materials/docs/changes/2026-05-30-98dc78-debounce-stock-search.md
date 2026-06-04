---
id: 2026-05-30-98dc78
name: Debounce MaterialStock search input
description: Debounce the stock search field (250ms) so typing filters the grid once typing settles, not on every keystroke.
status: implemented
modules: [Materials]
---

## Context

The MaterialStock search `TextField` was fully Redux-controlled: every keystroke
dispatched `setExtrasViewport` → `extra.query` changed → the viewport re-rendered
→ `useFilteredMaterials` recomputed over the whole catalog → the DataGrid
re-rendered. At large catalogs this means one full re-filter + grid re-render
per character. A performance e2e measuring real-UI search (typing the query
through the field) surfaced the cost: ~1.0–1.1s for a single search at
100–1000 materials, dominated by per-keystroke grid thrash.

## Change

`components/viewports/MaterialStockViewport/MaterialStockToolbar.tsx`:

- The search `TextField` now renders from **local state** (`localQuery`) so
  keystrokes echo instantly — the input stays responsive regardless of catalog
  size.
- Propagation upstream (`onQueryChange` → Redux → filter → grid) is **debounced
  250ms** (`SEARCH_DEBOUNCE_MS`) using the existing `@kernel/utils` `debounce`.
  A fast typist triggers one filter pass, not one per character.
- `onQueryChange` is read through a ref so the debounced function (built once via
  `useMemo([])`) stays stable across renders — a fresh identity would reset the
  debounce timer mid-type.
- A `useEffect([query])` syncs `localQuery` when the query changes from outside
  (programmatic clear, workspace switch). It does not clobber mid-type because
  `query` only changes once the debounced push lands.

No change to the search semantics (`useFilteredMaterials`), the `/` focus
shortcut, or the `data-material-count` mirror — only the cadence at which the
typed query reaches the filter.

## Status notes

Implemented. Verified via the standalone performance suite
(`Materials/tests/standalone/performance/catalogRender.e2e.test.ts`, run through
the real search drivers `searchMaterials.click.puppeteer.ts`): search latency
dropped from ~1.0–1.1s to ~0.53–0.61s at 100–1000 materials, and the grid no
longer re-filters/re-renders per keystroke.

## Security

None. No change to inputs accepted, data exposure, or trust boundaries — the
query string is handled exactly as before, only later.

## Performance

The intended win. Eliminates per-keystroke re-filter + DataGrid re-render;
a burst of N keystrokes now causes one filter pass after a 250ms pause instead
of N. Measured search-to-result fell ~45% (~1050ms → ~570ms) and stays flat
across 100→1000 materials, confirming per-keystroke thrash was the cost. The
input itself is unaffected (local state echo), so typing responsiveness does not
regress. Trade-off: a 250ms floor before results update after typing stops —
deliberate and standard for type-to-filter.
