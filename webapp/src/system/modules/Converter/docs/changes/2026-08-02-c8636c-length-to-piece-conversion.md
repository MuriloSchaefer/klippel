---
id: 2026-08-02-c8636c
name: Length-to-piece conversion for per-piece materials
description: Adds a metros5 → unitario18 conversion driven by `rendimento`, and fixes the DFS predecessor lookup in `convert` that made any non-first-branch target unreachable.
status: implemented
modules: [Converter, Graphs]
---

## Context

Materials stocked per piece — linha, botão, agulha — are consumed in a length
but held in `unitario18`. With the consumption unit shipped in
`2026-08-02-e9465a`, a `linha` type set to consume in metres could report usage
fine but never show a stock equivalent: the audit said *"não há conversão
definida entre essas unidades"*, because the shipped conversion graph had no
`metros5 → unitario18` edge. It models the fabric case (`m/un → Kg/un`, dividing
by `rendimento`) but not the per-piece one.

Adding that edge alone did **not** work, which exposed a second, older defect in
`convert`'s graph search — see below. Both are fixed here.

## Change

### The missing conversion

- `assets/conversion-graph.ts` — new `metros5-[conv]->unitario18` edge,
  `quantidade / (rendimentoQuociente / rendimentoDividendo)`. Mirrors the
  existing `m / un-[conv]->Kg / un` at the scalar level: a material declaring
  `rendimento: 400 m / un` converts 120 m of thread into 0.3 cones.
- The same asset's hand-maintained `adjacencyList` is updated on both ends
  (`metros5.outputs`, `unitario18.inputs`). The graph search reads adjacency,
  not the edge map, so an edge missing from the list is invisible.

This fixture is re-dispatched on every boot and every workspace switch
(`store/middlewares.ts` — `loadConversionGraph`), so existing workspaces pick
the edge up on reload; there is no migration.

### The DFS predecessor bug

`utils/convert.ts` decided whether a candidate node was reachable by looking up
the edge from `visitedNodes.at(-2)` — the previously *visited* node — to the
node being validated. With a LIFO stack, that is the actual predecessor only
when the target happens to sit on the first branch explored. `metros5` has five
outgoing conversions; `unitario18` was pushed second and therefore popped
fourth, by which point `visitedNodes.at(-2)` was `centimetros7`. No edge
`centimetros7 → unitario18` exists, so the node was rejected and a plainly
reachable unit was reported as unconvertible.

Every conversion in the graph today works by ordering luck. Any future edge
added to a well-connected unit could have hit the same wall.

- `kernel/modules/Graphs/searchAlgs/dfs.ts` — `validate` receives the real
  predecessor (`parentMap[visiting]`) as a new trailing argument. Trailing, so
  the other two callers are unaffected; `parentMap` is what `path` is rebuilt
  from, so validation and execution now agree on which edge is being taken.
- `utils/convert.ts` — uses that argument instead of `visitedNodes.at(-2)`.

## Status notes

Implemented. `npx tsc -p webapp/tsconfig.json --noEmit` passes.

Verified against the running dev app by side-importing the rebuilt modules and
replaying live workspace state — no page reload, so the session was left
untouched:

| conversion | result |
| --- | --- |
| **4 m → un** (rendimento 400 m/un) | 0.01 un — new, previously threw |
| m → cm / km / mm | 200 / 2 / 2000 — unchanged |
| Kg → g | 3000 — unchanged |
| min → h | 2 — unchanged |
| malha `m²/un → Kg/un` | 0.4125 Kg/un, 12.705 Kg total — unchanged |

End to end, the `linha` material that prompted this now reports 4 m/un, 120 m
total, ≈0.3 cones of stock; `malha` is byte-identical to before.

Pinned by `Composer/tests/standalone/integrity/consumptionUnitAudit.e2e.test.ts`
(authored, not yet executed — it needs a live dev app on CDP and resets its own
workspace).

Noted but **not** addressed, as it is out of scope and predates this change:
`convert` on a compound value whose edge expression uses the scalar
`quantidade` variable (e.g. `s / un → min / un`, `quantidade / 60`) yields
`null`, because the execution loop only injects `quantidadeQuociente` /
`quantidadeDividendo` for compounds. Nothing in the app currently depends on
that path — process time goes through `traceConversion`, which does its own step
execution — but it is a live trap for the next caller.

## Security

None. The new edge is a conversion expression evaluated through the existing
`jse-eval` path, which `utils/safeExpression.ts` already hardens (member/call
access neutered, curated function allow-list). It introduces no new evaluation
site, no new input surface, and no user-supplied expression — the expression is
a compile-time constant in a fixture. The DFS change alters which edge is
selected, not how expressions are evaluated.

## Performance

Negligible. The conversion graph gains one edge out of ~50; the DFS is over a
graph of tens of nodes and runs inside the already-debounced computation
middleware. Passing an existing map lookup as a callback argument costs nothing.

If anything this is marginally *faster* on the affected paths: a conversion that
previously exhausted the whole stack before throwing now stops at the target.
