---
id: 2026-08-30-4e98f7
name: The whole-catalog read no longer truncates at 1000
description: loadMaterialsCatalog asked for one page the size of the catalog, which loadWindow clamped to MAX_WINDOW_LIMIT — returning the first 1000 rows by rank with no indication anything was missing.
status: implemented
modules: [Materials]
---

## Context

Found while verifying cross-peer sync by hand: a material written on peer A
was returned by `materials.get(id)` on both peers, but appeared in neither
peer's `materials.load()` snapshot. Both reported exactly 1 000 materials.

`loadMaterialsCatalog` asked for one page sized at the row count:

```ts
const total = countMaterials(workspace);
const answer = loadWindow(workspace, { limit: Math.max(1, total), offset: 0 });
```

and `loadWindow` clamps every request to `MAX_WINDOW_LIMIT` (1 000) — a
deliberate ceiling, silently violated here. Past 1 000 materials the "whole
catalog" IPC returned the first thousand by rank, with a shape that looks
complete and no signal that anything was dropped.

It matters most where it is hardest to see: the collaborative tests use
`materials.load()` to observe what a peer has received, so on a workspace of
any size a correctly replicated material could be invisible to the assertion
that was checking for it.

## Change

`loadMaterialsCatalog` walks pages of `MAX_WINDOW_LIMIT` and merges them,
stopping when a page comes back short. The per-page ceiling is now exported
from `catalogDb.ts` rather than being a private constant the caller could not
see. Client-window tracking still happens once, over the full id set.

## Status notes

Implemented. Verified against a 1 000-material workspace where the 1 001st row
was previously absent from the snapshot.

## Security

None.

## Performance

The full read is now `ceil(total / 1000)` queries instead of one, which is the
cost of returning the rows it was asked for. It is not on any hot path: the
windowed read (`loadMaterialsWindow`) serves the app, and this IPC remains for
the perf harness and callers that genuinely want everything — for which
truncation, not round trips, was the expensive part.
