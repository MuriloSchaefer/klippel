---
id: 2026-08-30-ea4277
name: Boot skips the Jazz node reopen
description: The boot-time `refreshFromPeers` now runs only for a workspace that actually syncs, instead of closing and reopening the cojson context on every cold start.
status: implemented
modules: [Materials, Store]
---

## Context

Part of taking the materials catalog off the boot path — see the Materials
module's copy of this change (same id) for the whole picture.

`restartModule` opened the persisted workspace's Jazz node and then immediately
dispatched `refreshFromPeers`, whose middleware calls `jazz.refreshWorkspace`:
a **full close and reopen of the cojson context**. Its purpose is the first
sync round-trip after boot — to rebuild the context with the WS peer wired from
the start, so modules do not read stale-from-disk state.

For a workspace with no peers there is nothing to pull, and the reopen is not
free: it discards every CoValue the first open just read, so the next read of
each is cold again. On a 2 110-material workspace that showed up as a second
2.6 s catalog resolve, on the boot path, and it is proportionally worse for
everything else the boot reads.

## Change

`Store/kernelcalls.ts`: after `ensureWorkspace`, ask main for the sync status
and dispatch `refreshFromPeers` only when `syncStatus().syncUrl` is set.

`syncUrl` rather than the index entry's `syncOptIn` because the URL may also
come from the environment (`KLIPPEL_JAZZ_SYNC_URL`, used by the collaborative
harness and the dev script) — main resolves both, and `getSyncStatus` reports
what it resolved. A workspace that syncs boots exactly as before.

## Status notes

Implemented. `refreshFromPeers` itself is unchanged: the system-tray refresh,
and every other caller, still close and reopen the node.

## Security

None. The condition only decides whether an already-authorized local refresh
runs; it grants nothing and exposes nothing new.

## Performance

Removes one full cojson context teardown and rebuild from every cold start of a
local-only workspace — measured as one of three whole-catalog resolves at boot
(~11.9 s each before the Materials-side change in this set, ~2.6 s after).

## Related

- `Materials/docs/changes/2026-08-30-ea4277-catalog-off-the-boot-path.md`
