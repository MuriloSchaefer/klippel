---
id: 2026-05-23-d48a48
name: System-tray Jazz sync diagnostics (peers + logs)
description: Add the IPC + cojson LogSystem adapter that backs the new system-tray peer indicator and sync-log streamer.
status: implemented
modules: [Layout, Store]
---

## Context

`window.electron.jazz.syncStatus()` and `KLIPPEL_JAZZ_DEBUG=1` already exist as DevTools-only diagnostics for Jazz sync (landed 2026-05-23 in [`electron/main/jazz.ts`](../../../../../electron/main/jazz.ts)). To lift these surfaces into the system tray ([Layout change doc](../../../Layout/docs/changes/2026-05-23-d48a48-system-tray-sync-diagnostics.md)), the Store layer needs:

1. A subscribable stream of sync log events (so the renderer can show them live without polling).
2. A capped ring buffer feeding that stream, with secret-attribute filtering before any payload crosses the IPC boundary.

The existing `getSyncStatus()` is sufficient for the peers indicator (1 Hz polling); no Store change needed for that surface. The log streamer is the new piece this change adds.

## Change

In this module:

- New file `electron/main/jazzLogBuffer.ts`: ring-buffer module owned by the Jazz layer.
  - `installCojsonLogTap()` — calls `cojsonLogger.setLogSystem({...})` with a `LogSystem` implementation that records `{ id, ts, level, message, attributes }` into the ring buffer, stripping secret-attribute keys (`accountSecret`, `signerSecret`, `sealerSecret`, `token`, and any key matching `/secret$/i`) before storing. Idempotent; called once during main bootstrap.
  - `subscribe(listener)` / `unsubscribe(listener)` — event-emitter surface used by the IPC layer.
  - `snapshot(): SyncLogEntry[]`, `clear(): void`, `setEnabled(boolean): void` — read-only accessors plus a manual gate (the indicator's Pause control flips `enabled` to halt outbound emit; the buffer itself keeps recording).
  - Buffer capped at `MAX_BUFFER = 500`; drops oldest. Emission to subscribers is **batched on a 100ms tick** so a chatty DEBUG run delivers ≤10 batches/second to the renderer regardless of cojson's emit rate.

- `electron/main/jazz-hooks.ts` additions:
  - `jazz-sync-logs:snapshot` — returns the current ring buffer.
  - `jazz-sync-logs:clear` — clears the buffer; main process emits a synthetic `{level:"info", message:"buffer cleared"}` so the renderer sees the boundary.
  - `jazz-sync-logs:subscribe` / `jazz-sync-logs:unsubscribe` — push channel. Implemented as `webContents.send("jazz-sync-logs:batch", entries)` after each 100ms tick that has new entries. Subscription is keyed by `webContents.id` so renderer-side `useSyncLogs` cleanup unregisters correctly on unmount.
  - `jazz-sync-logs:set-enabled` — pause/resume the push channel without dropping entries from the buffer.

- `electron/preload/jazz.ts`: extend `jazzApi.syncLogs` with `{ snapshot, clear, subscribe(listener), setEnabled }`. The `subscribe` wrapper uses `ipcRenderer.on("jazz-sync-logs:batch", …)` and returns an `unsubscribe` thunk so consumers can `useEffect(() => api.syncLogs.subscribe(…), [])`-style.

- `electron/main/index.ts` boot: call `installCojsonLogTap()` after the existing `KLIPPEL_JAZZ_DEBUG` toggle so the tap is in place before any workspace opens (otherwise the first batch of cojson logs from peer-init is lost).

No change to existing `jazz-sync-status` (already shipped, the peers indicator consumes it directly).

The renderer-side components live in the [Layout change doc](../../../Layout/docs/changes/2026-05-23-d48a48-system-tray-sync-diagnostics.md).

## Roadmap

**Phase 1 — Peers indicator.**
Store side: nothing new. `getSyncStatus()` already returns `{ workspaceName, workspaceCoId, syncUrl, syncOptIn, peers, connected, accountId }`. Layout's `PeersIndicator` consumes the existing `window.electron.jazz.syncStatus()`. Gate: the existing IPC keeps its shape — explicit type export so the renderer doesn't drift.

**Phase 2 — Sync logs ring buffer + LogSystem adapter.**
Land `jazzLogBuffer.ts`, wire `installCojsonLogTap()` into main bootstrap, expose the four IPC handlers + preload bindings. Gate:
- Toggling `KLIPPEL_JAZZ_DEBUG=1` and triggering a CoValue mutation pushes a batch to a subscribed renderer within 200ms.
- Calling `clear` and then `snapshot` returns one synthetic "buffer cleared" entry.
- The 100ms throttle yields ≤10 `batch` events/second under cojson DEBUG flood; renderer remains responsive (Composer interactions under 50ms RPC budget per `jazz-performance.md`).
- Secret-keyed attributes never appear in `snapshot()` output — covered by a unit test on the filter.

## Status notes

Draft. Open decisions:

- The buffer is in-memory only. Persisting to a rotating log file for post-mortem support is deferred — would require a separate change with file-size/rotation policy.
- The Pause control on the indicator pauses *emission* to renderer subscribers, not the underlying buffer. Alternative semantics (pause the buffer entirely so cojson logs are dropped while paused) keep the renderer further off the hot path but make a post-pause Resume show only new events. Current proposal: pause emission only — Resume shows what was missed.
- No external sink (file, OTLP, Sentry). The `LogSystem` adapter is positioned to grow one later without rewiring callers.

## Security

- The ring buffer can receive any attribute the cojson logger emits at the configured level. We filter outgoing entries by attribute-key allowlist: any key matching `/(secret|token)$/i` is replaced with `"[redacted]"` before the entry lands in the buffer. Filter runs at insert time, not on read, so once an entry is in the buffer it has already been sanitized.
- The `clear` IPC is a no-input write surface. It is read-only with respect to the catalog (does not touch Jazz CoValues) and has no destructive blast radius beyond the in-memory buffer.
- `subscribe` accepts no input from the renderer beyond the subscription request (no filter strings, no regex). Eliminates a renderer-side injection vector into the main-process log reader.
- The buffer never persists secrets to disk because the buffer never persists at all (Phase 1 scope). If file persistence is added later, the filter applies before write.
- Hard cap of 500 entries keeps memory bounded; cojson cannot drive an OOM by spinning the logger.

## Performance

- Insert is O(1) ring-buffer write + a key-attribute filter (small object, <10 keys typical).
- Subscriber emit is **batched on a 100ms tick** — the worst case is one `webContents.send` call per renderer per 100ms with an array of up to ~50 entries (500-entry buffer / 10 batches per second). Renderer reducer cost is dominated by the row render, not the IPC marshaling.
- `setEnabled(false)` short-circuits batch emit; buffer keeps recording at insert-time cost only.
- No measurable impact on the Composer / Materials IPC hot path: this is a side channel on cojson's logger, off entirely unless `KLIPPEL_JAZZ_DEBUG` is set, and even on it stays off the request-response IPC handlers.
- Renderer-side virtualization keeps the rendered row count bounded regardless of buffer depth.
