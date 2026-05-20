---
id: 2026-05-18-b5c2fb
name: collaborative jazz sync + share/join UI + e2e harness
description: Wire Jazz peers to a local cojson sync server, add Share/Join workspace UI in the ribbon, and ship a multi-peer e2e harness (first target: lease banner visibility across peers).
status: draft
modules: [Store, Composer]
---

## Context

Phase 1/2 jazz e2e tests run against a single Electron renderer with `peers: []` (see [jazz.ts:188-198](webapp/electron/main/jazz.ts#L188-L198)). There is no harness today that can spin up multiple instances and have them share a `WorkspaceCoMap`, so we cannot exercise any cross-peer contract — lease visibility, sync convergence, conflict resolution.

Phase 3 needs a reusable boilerplate that:

1. Accepts a peer count `N`.
2. Allocates each peer its own `ENV_NAME` (temp dir under `~/klippel/envs/`), its own `KLIPPEL_CDP_PORT`, its own Electron user-data dir.
3. Wires the peers together so a `WorkspaceCoMap` created on peer 0 is loadable by peers 1..N-1 via its `coId`.
4. Tears every instance + temp dir down deterministically on test exit (success or failure).

The first consumer of the harness is the lease-banner collaborative test owned by Composer (see sibling change doc).

## Change

### Peer transport — local cojson sync server (chosen)

`openWorkspaceJazzNodeInner` currently passes `peers: []` ([jazz.ts:188-198](webapp/electron/main/jazz.ts#L188-L198)). Add a WebSocket peer when `WorkspaceMetadata.syncOptIn` is `true` and a sync URL is configured. URL resolution order:

1. `KLIPPEL_JAZZ_SYNC_URL` env var (used by the e2e harness and dev).
2. A per-workspace `syncUrl` field on `WorkspaceMetadata` (so the user can join a peer's workspace via UI without restarting).
3. None → no peer (current behavior).

Use the `cojson-transport-ws` (or whichever ws peer module ships with the project's `jazz-tools` version) `WebSocketPeer` against the sync server. The sync server is the standalone cojson sync-server binary: spawn it (a) from the e2e harness, and (b) from a tiny dev script `npm run jazz:sync` for local manual testing across two real Electron windows.

The `disallowRelay: true` flag set in [jazz.ts:280](webapp/electron/main/jazz.ts#L280) blocks the very relay we now want. The Share UI must flip `syncOptIn` to `true` and `disallowRelay` to `false` on the originating workspace's `WorkspaceMetadata`. Workspaces created before this change keep their current values and remain offline until the user opts in.

### Workspace join (main process)

Add a main-process entry point `joinJazzWorkspace({ name, coId, syncUrl })` that:

1. Creates a local workspace dir.
2. Opens a Jazz node against it with a WebSocket peer dialing `syncUrl`.
3. Awaits `WorkspaceCoMap.load(coId)` — the CoValue and its `WorkspaceMetadata` arrive from the remote peer.
4. Writes `.jazz-id = coId`, registers in `workspaces.index.json` with `{ name, coId, syncOptIn: true, syncUrl }`.

It does **not** call `WorkspaceCoMap.create`; the CoValue already exists on the originating peer.

Renderer-side: expose `window.electron.jazz.joinWorkspace(input)` on the preload bridge.

### Share / Join UI (renderer)

Two new ribbon buttons next to [NewWorkspaceButton.tsx](webapp/src/kernel/modules/Store/components/NewWorkspaceButton.tsx) — both follow the existing `PointerContainer` pattern used by `NewWorkspaceButton`.

**`ShareWorkspaceButton.tsx`** — icon `IosShareIcon` (or `LinkIcon`). Disabled when no active workspace.
- On open: ensure the active workspace has `syncOptIn: true` and a `syncUrl` set (default to the dev sync URL — see Sync server lifecycle below); if either flip is required, perform it inside the pointer panel after user confirms ("Enable collaboration for this workspace").
- Panel content: shows the `coId` (read-only `TextField`) and the `syncUrl` (read-only `TextField`), each with a "Copy" `IconButton`. Optionally a single concatenated invite string `klippel://join?coId=…&syncUrl=…` for one-click paste. No share-link generation outside the local LAN — this is paste-and-type for now.
- Every actionable control inside the panel that has a keyboard shortcut ships with a `ShortcutHint` (per CLAUDE.md). The Copy buttons get `Ctrl+C`-when-focused mirroring; the close action gets the existing `Escape`.
- Mirror attribute on the panel root: `data-testid="share-workspace-panel"`, plus `data-share-coid` and `data-share-sync-url` for e2e assertion without scraping input values.

**`JoinWorkspaceButton.tsx`** — icon `GroupAddIcon`.
- Panel content: a form with `coId` `TextField`, `syncUrl` `TextField` (prefilled with the dev/default value), and a local `name` `TextField` (defaults to `joined-<coId.slice(0,6)>`). `ConfirmAndCloseButton` dispatches a new `joinWorkspace({ name, coId, syncUrl })` Store action that calls `window.electron.jazz.joinWorkspace` and selects the joined workspace.
- A single accepted invite string can be pasted into any field; parse `klippel://join?…` on paste to populate the other fields.
- Mirror: `data-testid="join-workspace-panel"`, `data-testid="join-workspace-submit"` on the confirm button.

Ribbon wiring: both buttons land in the same row as `NewWorkspaceButton`. Concretely, in [RibbonMenu/index.tsx](webapp/src/kernel/modules/Layout/components/RibbonMenu/index.tsx) where the workspace controls are composed.

### Sync server lifecycle

- **e2e**: harness spawns one cojson sync server on a free port per run; tears it down on `afterAll`.
- **dev**: `npm run jazz:sync` script spawns the sync server on a fixed port (e.g. `4242`) and prints the URL. The Share button's "default sync URL" reads from `import.meta.env.VITE_JAZZ_SYNC_URL` or falls back to `ws://127.0.0.1:4242`. Production builds leave it unset → Share is still functional but the user must paste a URL they trust.
- **prod**: out of scope for this change. A future change can ship a hosted relay or instructions for running the sync server on a LAN host.

### Harness module

New helper under `webapp/src/helpers/puppeteer/` (exact name TBD — proposal: `collaborativeHarness.ts`) exporting:

```ts
type Peer = { page: Page; envName: string; cdpPort: number; userDataDir: string };
type Harness = { peers: Peer[]; syncUrl: string; teardown: () => Promise<void> };
async function spawnPeers(count: number, opts?: { baseWorkspace?: string }): Promise<Harness>;
```

Responsibilities:

- Allocate `count` free TCP ports for CDP, plus one for the sync server.
- For each peer: create a temp env dir, spawn `electron-vite preview` (or the same `npm run dev` command the existing tests assume — see open question) with `ENV_NAME=<unique>`, `KLIPPEL_CDP_PORT=<unique>`, `KLIPPEL_JAZZ_SYNC_URL=<sync url>`, `ELECTRON_USER_DATA_DIR=<temp>`, **`ELECTRON_RUN_AS_NODE` unset**.
- `puppeteer.connect` to each, return the `Page`.
- Teardown: SIGTERM each Electron, rmrf each env dir, stop sync server. Always run on Jest `afterAll`, even on failure.

### Reusable cross-peer helpers

The first iteration drives every cross-peer step through the existing MCP tools (`createWorkspace`, `shareWorkspace`, `joinWorkspace`) with `getPage` mocked to switch peers. Dedicated `joinWorkspaceOnPeer` / `enableSyncOnPeer` IPC wrappers landed earlier but were never consumed — removed in favor of the MCP-tool path. Re-add them only when a test genuinely needs to bypass the UI.

### Test layout

The lease banner test (and future collaborative tests) live under the consuming module's `tests/collaborative/<category>/` directory (per [e2e-tests.md:13-31](webapp/src/docs/quality/e2e-tests.md#L13-L31)). The harness is shared infra, not a test, so it lives in `webapp/src/helpers/puppeteer/`.

**`resetWorkspace` substitute.** The e2e rules (§4) require `beforeAll` to call `resetWorkspace(page, '<unique>')` for standalone tests. Collaborative tests skip that helper because the harness owns the equivalent contract: every peer gets a fresh `envDir`/`userDataDir` (pre-cleaned on spawn, removed on teardown), and the sync server is in-memory + per-run. Tests should not call `resetWorkspace` on a harness-owned peer.

## Status notes

Draft.

Resolved:

- **Sync transport**: local cojson sync server (option A).
- **`syncOptIn` / `disallowRelay`**: flipped by the Share button on the originating workspace. Tests drive the Share UI through the `shareWorkspace` MCP tool rather than a dedicated harness helper. Joined workspaces are written with `syncOptIn: true` by `joinJazzWorkspace`.
- **Share/Join surface**: in the Store module, wired into the existing ribbon row next to `NewWorkspaceButton`. Uses the same `PointerContainer` pattern.

- **Launch mode**: local dev → `npm run dev` per peer; CI/CD → installed/packaged app invoked directly (one process per peer). Harness exposes a `mode: 'dev' | 'installed'` switch defaulting from `process.env.KLIPPEL_E2E_MODE` (defaults to `dev`).
- **Invite URI**: `klippel://join?coId=<coId>&syncUrl=<urlencoded ws url>`.

Open:

1. **Account identity.** Each peer writes its own `.account-creds.json`, so peer 0 ≠ peer 1 by construction. Assert this in harness setup so a future refactor that shares creds (e.g. clipboard-driven identity transfer) does not silently break collaborative tests.
2. **`KLIPPEL_USE_XVFB`** interaction — N Electron instances under one Xvfb display works in practice; confirm before headless CI.

## Security

- **Sync URL validation.** The user-pasted `syncUrl` in the Join panel must be validated: only `ws://` or `wss://`, no userinfo, no embedded credentials. Reject `file://`, `javascript:`, etc. Same validation applies to the env-var path in main process.
- **Sync server bind.** The cojson sync server spawned by the dev script or harness binds to `127.0.0.1` only. Document the LAN-host setup (and its trust assumptions) when a future change ships it.
- **CoValue authority is unchanged.** Jazz already enforces signature checks on every change — a malicious sync server cannot forge edits, only withhold or delay them. That model holds here; this change does not add new trust in the transport.
- **Sealer/signer secrets stay local.** Sharing only ever exposes `coId` + `syncUrl`. Account credentials never leave `.account-creds.json` and are never serialized into the invite string. The Share panel must not render the active account's secret anywhere.
- **Temp env dirs** in the harness are created with restrictive mode (700) — they hold `.account-creds.json`. Per-run, removed on teardown.
- **No new IPC outside the bridge.** `joinWorkspace` is the only new method on the `window.electron.jazz` preload surface; it validates inputs at the main-process boundary before touching disk or opening a peer.
- **Existing workspaces stay offline by default.** This change does not retroactively flip `syncOptIn` on any existing `WorkspaceMetadata`; only the explicit Share action does.

## Performance

- Each Electron peer is ~150 MB RSS; cap practical N at 4–5 for local runs.
- cojson sync server is negligible (~30 MB).
- Test suite wall-clock grows linearly with N during boot (~3 s/peer). Boot peers in parallel via `Promise.all` to keep total at the single-peer cost + a small constant.
- Production-path impact when a workspace is opted in: one WebSocket peer per active workspace + ongoing CoValue sync. Loopback is free; LAN is bounded by user activity. Workspaces with `syncOptIn: false` keep the existing zero-overhead path.
- Share/Join panels are inert until opened — no cost at startup.
