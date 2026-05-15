---
id: 2026-05-13-4ac265
name: Complete temporal × unitario compound coverage
description: Add the missing temporal/unitario COMPOUND_UNIT nodes (both orientations) and direct CONVERTS_TO edges to min/un so every accepted process-time input has a real graph path; partner change to Composer's single-trace-path collapse.
status: implemented
modules: [Converter, Composer]
---

## Context

The conversion graph only had `min/un`, `un/min`, and `un/h` as temporal × `unitario18` compounds. Any other user input (`h/un`, `d/un`, `un/s`, etc.) had no compound node and forced `computeProcessTime` into special-case branches. Worse, `traceConversion` was normalizing `min/un` to `seg/un` (temporal scale base = `segundos248`) and failing because no `seg/un` compound node existed either.

Filling out the bipartite graph (every temporal unit × `unitario18`, both orientations) plus a star of direct `CONVERTS_TO` edges to `min/un` means **the graph itself is the source of truth** for which inputs are convertible; no code special-cases any unit.

## Change

`assets/conversion-graph.ts`:

- **9 new `COMPOUND_UNIT` nodes**:
  - Time per unit: `s / un`, `h / un`, `d / un`, `sem / un`, `mes / un`
  - Unit rate: `un / s`, `un / d`, `un / sem`, `un / mes`
  (`min / un`, `un / min`, `un / h` already existed.)
- **18 structural edges** (one `QUOTIENT`, one `DIVIDEND` per new node).
- **11 `CONVERTS_TO` edges, all targeting `min / un`** (star topology — every temporal × unitario compound has a direct one-step conversion to the canonical `min/un`, including new direct edges from the pre-existing `un / min` and `un / h`). Each edge uses an `expression` `conversionType` with the appropriate scalar factor (e.g. `h / un → min / un`: `(quantidadeQuociente * 60) / quantidadeDividendo`; `un / d → min / un`: `(quantidadeDividendo * 1440) / quantidadeQuociente`).
- `adjacencyList` updated: new compound nodes added; `unitario18`, `segundos248`, `hora250`, `dia251`, `semana253`, `mes252` extended with their new `QUOTIENT`/`DIVIDEND` inputs; `un / min` and `un / h` extended with their new outputs; `min / un` inputs extended with all 11 new conversion edges.

## Status notes

Implemented. The companion `traceConversion` short-circuit and `computeProcessTime` collapse live under `Composer/docs/changes/2026-05-13-4ac265-process-time-single-trace-path.md`.

## Security

None.

## Performance

Graph size grows by ~38 entries (9 nodes + 29 edges). DFS hit cost stays O(neighbors); paths are typically 1 step now (direct compound → `min/un`) instead of multi-hop normalisation detours. Net win.
