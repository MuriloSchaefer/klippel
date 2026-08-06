---
id: 2026-08-02-c8636c
name: dfs passes the real predecessor to validate
description: The `validate` callback now receives the node that pushed the one being visited, so callers stop inferring the predecessor from visit order.
status: implemented
modules: [Converter, Graphs]
---

## Context

`dfs` walks with a LIFO stack, so the previously *visited* node is the
predecessor of the node being validated only when the branch happens to be
explored first. `Converter/utils/convert.ts` relied on exactly that — it looked
up the conversion edge from `visitedNodes.at(-2)` — and consequently rejected
reachable nodes whenever the target sat on any branch but the first.

The concrete failure: `metros5` has five outgoing conversions, so a newly-added
`metros5 → unitario18` edge put its target fourth in pop order. By then
`visitedNodes.at(-2)` was `centimetros7`, no `centimetros7 → unitario18` edge
exists, and a plainly reachable unit was reported as unconvertible. Full
reasoning in `Converter/docs/changes/2026-08-02-c8636c-length-to-piece-conversion.md`.

`dfs` already tracks the true predecessor in `parentMap` — it is what `path` is
reconstructed from — it simply never handed it to the caller.

## Change

- `searchAlgs/dfs.ts` — `validate` gains a trailing `parentNode?: string`
  argument, populated from `parentMap[visiting]` (`undefined` for the start
  node). Trailing and optional, so the other callers
  (`store/graphInstance/middlewares.ts`, `Graphs/index.ts`) are unaffected and
  needed no edit.

The doc comment on the parameter states why a caller must use it rather than
reach into `visitedNodes`, since the old approach looks plausible and fails only
on some inputs.

Because `path` is rebuilt from the same `parentMap`, validation and execution
now agree on which edge is being taken — previously a caller could, in
principle, validate one edge and then execute a different one.

## Status notes

Implemented. `npx tsc -p webapp/tsconfig.json --noEmit` passes.

Verified via the Converter's conversion suite replayed against live app state —
the newly-reachable conversion resolves and eight existing ones (scalar length,
mass, time, and the compound `m²/un → Kg/un` material path) return identical
values. Table in the Converter change document.

No behavioural change for a caller that ignores the new argument.

## Security

None. A search callback receives one additional node id that the algorithm
already held internally. No new input surface, no evaluation, no persistence.

## Performance

None. One map lookup per visited node, on a value already computed for
`parentMap`. Graphs traversed here are tens of nodes.
