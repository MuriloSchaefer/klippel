---
id: 2026-05-23-d48a48
name: System-tray Jazz sync diagnostics (peers + logs)
description: Add two system-tray IconButtons that surface live Jazz sync state (connected peers, streaming sync log) so users can diagnose sync without DevTools.
status: implemented
modules: [Layout, Store]
---

## Context

The kernel currently exposes two diagnostic surfaces for Jazz sync that only engineers know about: the `window.electron.jazz.syncStatus()` IPC and the `KLIPPEL_JAZZ_DEBUG=1` env toggle that flips cojson's `logger` to DEBUG. Both require DevTools / a launch-config edit. Recent collaborative testing showed that when sync silently fails (wrong sync URL, `syncOptIn` not flipped, peer can't reach the server) end users have no UI feedback at all — the catalog just doesn't update.

The fix is to lift both surfaces into the system tray as IconButtons next to the existing theme toggle. Layout owns the rendered tray + popovers; Store owns the IPC handlers and the sync-event ring buffer that backs them.

## Change

In this module:

- New `components/SystemTray/PeersIndicator.tsx`: `IconButton` wrapped in `PointerContainer`. Renders `CloudDoneSharp` / `CloudOffSharp` based on `connected`, with an MUI `Badge` showing the peer count. Tooltip lists peer ids. The panel renders a small read-only table of `{ syncUrl, syncOptIn, accountId, workspaceCoId }` plus a peer-id list (one row per id). Subscribes to a periodic poll of `window.electron.jazz.syncStatus()` (1 Hz; cheap call, no Jazz reads). Registers itself in the `systemTray` component registry from `kernelCalls/index.ts` so it sits next to `WorkspaceSelector` / `SessionAutoSaverIcon`.
- New `components/SystemTray/SyncLogsIndicator.tsx`: `IconButton` (`ReceiptLongSharp`) with a `Badge` showing unseen log count (cleared when panel opens). Click opens a `PointerContainer` panel with a virtualized list of the last 500 sync events. Toolbar: Pause, Resume, Clear, Copy All. Auto-scrolls to bottom while not paused. Renders rows colored by level (info / warn / error). Backed by a new renderer-side hook `useSyncLogs()` that subscribes to the IPC event channel introduced on the Store side.
- `components/SystemTray/SystemTray.tsx` — no code change; the new components are picked up via the existing registry walk. Their tray order is registration-order in `kernelCalls`.
- `kernelCalls/index.ts` — register `PeersIndicator` and `SyncLogsIndicator` under `SYSTEM_TRAY_REGISTRY_NAME`.

Pointer-container scaffolding (drag, focus, confirm/close handlers) is reused as-is; no changes to `kernel/modules/Pointer`.

The Store-side IPC additions and log-buffer surface are tracked in the paired [Store change doc](../../../Store/docs/changes/2026-05-23-d48a48-system-tray-sync-diagnostics.md).

## Roadmap

**Phase 1 — Peers indicator.**
`getSyncStatus()` already exists (added 2026-05-23 in `electron/main/jazz.ts`). Layout side: build `PeersIndicator` consuming the IPC on a 1-second `setInterval`. Pause polling when the tray is hidden (page visibility API). Gate: the indicator flips between green/red on actual sync server up/down within ~1s, and the popover lists the expected peer ids during a two-peer dev compound session.

**Phase 2 — Sync logs.**
Store side: install a `LogSystem` adapter into cojson's `logger`, route every entry into a 500-entry ring buffer, expose `jazz-sync-logs:subscribe` / `jazz-sync-logs:clear` / `jazz-sync-logs:snapshot` IPCs. Layout side: `SyncLogsIndicator` + `useSyncLogs` hook that opens the subscription on mount and tears it down on unmount. Gate: opening the panel while toggling `KLIPPEL_JAZZ_DEBUG=1` shows live `sync send` / `sync recv` lines that match the cojson stdout, with no renderer freeze under sustained DEBUG output.

## Status notes

Draft. Open decisions:

- Where to host the indicator components: a new `kernel/modules/Sync` would be ideal long-term, but for this change keeping them inside Layout (UI) + Store (data) avoids a new module boundary. Revisit if a third sync-related surface lands.
- Whether to persist the log buffer across page reloads. The buffer lives in the main process so it already survives renderer reloads; explicit persistence to disk (for post-mortem analysis) is not in scope here.
- Tooltip i18n: copy strings live alongside the components; no translation layer yet.

## Security

- The sync log panel can surface any string the cojson logger emits. Cojson does not log secrets (account secret keys, signing keys) at INFO/DEBUG today, but the renderer-facing payload is **filtered**: we strip any `accountSecret`, `signerSecret`, `sealerSecret`, or `token` attribute keys before pushing into the ring buffer. Same allowlist applied to the IPC snapshot endpoint.
- Ring buffer is capped at 500 entries (~50KB worst case for 100-char messages). Drops oldest on overflow; renderer never sees more than `MAX_BUFFER` rows so a chatty DEBUG run cannot grow unbounded.
- The new IPCs (`jazz-sync-status`, `jazz-sync-logs:*`) are read-only — they expose state but accept no input that could mutate the catalog or workspace. The `syncStatus` payload includes the local `accountId`, which is already exposed via the existing `jazz-get-account-id` IPC; no new identity disclosure.
- No new file I/O, no new credential storage.

## Performance

- `syncStatus()` is a synchronous read of in-memory state (peer list, index entry, workspace name). 1 Hz polling from the Peers indicator is negligible.
- Sync log subscription: cojson at DEBUG can emit 100s of entries/sec during a large CoValue load. The IPC layer **throttles** to one batched update per 100ms — entries accumulate in a server-side outbox and ship as an array, so the renderer reducer/render runs at ≤10 Hz regardless of stream rate.
- Renderer-side list is virtualized (MUI `@mui/x-virtual` or simple windowing) so the DOM holds ~30 rows even when the buffer is full.
- Paused state stops pushing batches over IPC entirely (server keeps the ring buffer fresh, but does not transmit until the renderer resumes). Prevents the chatty-DEBUG-pins-renderer failure mode the requirements call out.
- No impact on the IPC hot path used by Composer or Materials — the new IPCs live alongside the existing ones; sync chatter routing is a side channel on cojson's logger only when `KLIPPEL_JAZZ_DEBUG` is enabled.
