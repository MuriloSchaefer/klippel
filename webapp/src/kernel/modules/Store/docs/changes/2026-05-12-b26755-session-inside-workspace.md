---
id: 2026-05-12-b26755
name: Move .session/ inside each workspace folder
description: Relocate per-module session files from `<env>/.session/<Module>` to `<env>/workspaces/<workspace>/.session/<Module>`, leaving only the workspace registry at the env root, so session state is workspace-scoped by construction.
status: partially implemented
modules: [Store, Layout, Graphs, SVG, KeyboardShortcuts, Markdown, Loader, Composer, Materials, Orders, Converter]
---

## Context

Today every persisted slice writes to `<env>/.session/<Module>/...` (see `webapp/src/**/store/slice.ts`). The `Store` slice also holds `selectedWorkspace`, but **no other slice is workspace-aware**: switching workspace via the `WorkspaceSelector` only updates `Store.selectedWorkspace`. The in-memory state of every other module continues to reflect the previously loaded workspace, and on next restart the slices restore from a single shared `.session/` that mixes data from whichever workspace last wrote.

Concrete consequences:

- **Cross-workspace leakage.** Open viewports, materials, graphs, panels, theme, ribbon state — all of these get written to a single `.session/Layout/...`, `.session/Materials/...`, etc. The "workspace" abstraction is mostly a label on top of one shared session.
- **Hard resets are noisy.** [resetWorkspace.ts](webapp/src/helpers/puppeteer/resetWorkspace.ts) has to wipe both `workspaces/<target>/` *and* the entire `.session/` directory, then pre-seed `.session/Store/state.json`. That's why every test does a full `page.reload()` — there's no way to "switch into a clean workspace" because the session state isn't scoped to a workspace.
- **The soft-workspace-reset effort (item 1 of `2026-05-12-528e7f-e2e-speedups`)** can't move forward cleanly: rehydrating each slice from `<env>/.session/...` doesn't change what data they load when the workspace changes. The slices would need workspace-aware paths first — which is exactly this change.

Moving `.session/` inside each workspace folder makes workspace isolation structural rather than conventional. After this change:

- Per-workspace state lives at `workspaces/<name>/.session/<Module>/...`.
- A reset is a single recursive delete of the workspace directory.
- Workspace switch becomes a re-read of every slice from the new prefix — well-defined and uniform.
- Only `.session/Store/state.json` (the workspace registry: `{ workspaces, selectedWorkspace }`) stays at the env root, because it answers "which workspace do I load on boot?"

## Change

### 1. Path resolution becomes workspace-aware

Add a single helper in `kernel/modules/Store` that resolves any session-relative path against the current workspace:

```ts
// webapp/src/kernel/modules/Store/sessionPath.ts (new)
export const sessionRoot = (workspace: string) =>
  `workspaces/${workspace}/.session`;
export const sessionPath = (workspace: string, segment: string) =>
  `${sessionRoot(workspace)}/${segment.replace(/^\/?/, '')}`;
```

Slices must not embed `"."session/..."` literals anymore. They call `sessionPath(currentWorkspace, "<Module>/state.json")` (or equivalent) at every read/write.

Open question: do we make this an injected dependency (e.g. expose `storage.workspaceScope(workspace)`) so slice code stays workspace-agnostic? Probably yes — keeps slice signatures unchanged and centralizes the rule. See the **Storage helper** subsection below.

### 2. Storage helper: workspace-scoped facade

Extend [electron/main/storage.ts](webapp/electron/main/storage.ts) and the preload typings so the renderer can ask for a scoped handle:

```ts
const wsStorage = globalThis.electron.storage.forWorkspace(workspaceName);
wsStorage.ensureDir(".session/Layout");
wsStorage.writeBlob(".session/Layout/theme.json", ...);
```

Under the hood `forWorkspace(name)` prepends `workspaces/<name>/` to every path passed in. This keeps slice code looking nearly identical to today — only the handle changes — and prevents accidental writes outside the workspace.

Alternative considered: rewrite every slice to compute paths with `sessionPath()`. Rejected: more diff, more chances to miss a callsite, no encapsulation.

### 3. Bootstrap order

The current pattern at module-import time is:

```ts
const storage = globalThis.electron.storage;
storage.ensureDir(".session/Layout");
const slice = createSlice({ initialState: await restoreSession() });
```

This breaks once `.session/` is workspace-scoped: at module-import time we don't yet know the workspace. Resolution:

- The `Store` slice continues to read `<env>/.session/Store/state.json` synchronously at import (it owns `selectedWorkspace`).
- Every other slice's `restoreSession()` defers: it reads `Store/state.json` *first* to learn the workspace, then opens `workspaces/<ws>/.session/<Module>/...`. A small `getInitialWorkspace()` helper in `Store` (sync) provides the value at import time.
- Future-proofing: keep a `rehydrate(workspace)` reducer on every slice (the soft-reset prerequisite from item 1 of the speedups plan), so switching workspaces re-reads from the new prefix without a page reload. This change is the gating step — once it lands, item 1 becomes mechanical.

### 4. Workspace registry stays at env root

`Store` is special. Two files stay at `<env>/.session/Store/`:

- `state.json` — `{ workspaces: string[], selectedWorkspace: string }`. Must be readable before any workspace context exists.
- Anything else `Store` writes today that's genuinely env-scoped (e.g. `sessionAutoSaveInterval`).

Slice code in `Store` continues to write env-root paths via the unscoped `storage` handle. No `forWorkspace` for `Store`.

### 5. Filesystem migration

On boot, if `<env>/.session/` contains module folders other than `Store/`, copy them into the currently-selected workspace's `.session/` (best-effort, idempotent), then delete the env-root copies. Implemented in the main process during `initStorageHooks`.

- Triggers exactly once per env per upgrade (marker file `<env>/.session/.migrated-b26755`).
- If `selectedWorkspace` is missing or stale, fall back to the first workspace in the registry, or `pessoal` (existing default).
- Test envs (`~/klippel/envs/small-app/` and similar) need to migrate too — same code path.

This is the most error-prone piece. Detailed plan:

1. Read `<env>/.session/Store/state.json` → resolve target workspace.
2. For each module dir under `<env>/.session/` except `Store/`: `cpSync` into `<env>/workspaces/<ws>/.session/<Module>/` if the destination is empty; skip otherwise (don't clobber data the user has put there in a newer install).
3. After successful copy, remove the env-root module dirs.
4. Write `.migrated-b26755`.

### 6. Test infrastructure

[resetWorkspace.ts](webapp/src/helpers/puppeteer/resetWorkspace.ts) simplifies:

- Drop the `.session/` wipe entirely (it's inside the workspace dir now).
- Drop the manual `Store/state.json` seed (the registry stays at env root and is updated via `storage` on workspace creation).
- Keep the `cpSync(baseDir, targetDir)` step — it now copies the `.session/` along with the workspace contents, which is the desired behavior.
- `page.reload()` is still required *until* item 1 of the speedups plan lands; this change is a prerequisite, not a replacement.

E2E `BASE_WORKSPACE=empty` semantics improve: the "empty" base workspace becomes self-contained (no need to know which session keys to seed). Multiple test files can pick distinct workspaces and genuinely not see each other's data.

### 7. Slices to update

One-line summary of the touch surface — each is a path change inside the slice (no behavior change):

| Module | Slice file |
|---|---|
| Layout | `Layout/store/slice.ts` (theme), `viewports/slice.ts`, `viewports/groups/slice.ts`, `ribbonMenu/slice.ts`, `panels/slice.ts` |
| Graphs | `Graphs/store/graphInstance/slice.ts`, `graphsManager/slice.ts` |
| SVG | `SVG/store/slice.ts` |
| KeyboardShortcuts | `KeyboardShortcuts/store/slice.ts` |
| Markdown | `Markdown/store/slice.ts` |
| Loader | `Loader/store/slice.ts` |
| Composer | `Composer/store/slice.ts`, `models/slice.ts`, `variations/slice.ts` |
| Materials | `Materials/store/slice.ts`, `materialTypes/slice.ts`, `materials/slice.ts` |
| Orders | `Orders/store/budgets/slice.ts` |
| Converter | `Converter/store/slice.ts` |

Per-module change docs are not duplicated; this Store doc is the canonical reference. Each affected slice's diff is a path-resolution swap to `wsStorage` and (if it has a `restoreSession`) reading the workspace from `Store` before resolving the path.

## Status notes

Partially implemented — code in place, not yet exercised against a real Electron boot or the e2e suite.

**Landed:**

- New `webapp/src/kernel/modules/Store/workspaceScope.ts` — exports `getCurrentWorkspace()` (async, reads `.session/Store/state.json` once and caches), `setCurrentWorkspace()`, and `forWorkspace(name)` returning a `StorageAPI` facade that prepends `workspaces/<name>/` to every path. Sanitizer strips `/`, `\`, `..` from the workspace name.
- `Store/slice.ts` warms the cache via `setCurrentWorkspace(initialStoreState.selectedWorkspace)` immediately after `restoreStoreSession()` resolves.
- `Store/middlewares.ts` calls `setCurrentWorkspace(payload.workspace)` inside the `selectWorkspace` listener so subsequent slice reads (after a rehydrate, once item 1 of the speedups plan lands) see the new workspace.
- 18 non-Store slices rewritten to use `const storage = forWorkspace(await getCurrentWorkspace());` (kernel: `Graphs/{graphInstance,graphsManager}`, `Layout/{slice,panels,ribbonMenu,viewports,viewports/groups}`, `Loader`, `Markdown`, `SVG`; system: `Composer/{slice,models,variations}`, `Converter`, `Materials/{slice,materials,materialTypes}`, `Orders/budgets`). Path literals in those slices stay as `.session/<Module>/...`; the facade routes them under `workspaces/<ws>/`.
- Migration intentionally skipped — Klippel is pre-production, so existing `<env>/.session/<Module>` data can be wiped manually if it interferes (or the env directory removed entirely). No idempotency code carried in the build.
- `webapp/src/helpers/puppeteer/resetWorkspace.ts` simplified — no longer wipes `<env>/.session/` (now per-workspace inside the dir we already remove); still writes `<env>/.session/Store/state.json` so Store boots into the new workspace.

Validation done in this session:

- `tsc --noEmit` clean.
- `swc.transformFileSync` on representative slices (`Store/slice.ts`, `workspaceScope.ts`, `Layout/store/slice.ts`, `Loader/store/slice.ts`, `Materials/materials/slice.ts`) — all compile, top-level await preserved.
- No remaining `.session/` literals outside slice files or the workspaceScope helper.

**Not yet validated:**

- Actual Electron boot. First boot will trigger the migration; if `selectedWorkspace` in `state.json` doesn't match a real workspace dir, slice reads will land under a non-existent path (slices currently tolerate missing files in `restoreSession`).
- E2E suite. Boot has not been exercised yet.

Per-instance staleness fix (follow-up to initial pass):

- Added `workspaceStorage` Proxy in `workspaceScope.ts` — re-resolves `forWorkspace(cached)` on every property access, so consumers automatically pick up the workspace at the moment of the call rather than at module import.
- `Graphs/store/graphInstance/slice.ts` now imports `workspaceStorage as storage` and drops its module-load `await`. Once the soft-reset (`2026-05-12-528e7f` item 1) lands and `setCurrentWorkspace()` updates the cache on `workspaceSelected`, graph persistence will route to the new workspace without a re-import. The Proxy throws a clear error if accessed before the Store slice has warmed the cache.
- ribbonMenu slice does not call `restoreSession()` at all today (the slice has no persistence on load) but still writes to `.session/Layout/ribbonMenu`. Confirm the path-only change is the right surface.

Open questions:

1. **Sync vs. async workspace lookup at slice-import time.** The cleanest answer is: `Store` exposes `getInitialWorkspace(): string` synchronously by reading `state.json` with `readFileSync` once at module-import, caching the result. All non-`Store` slices import that helper. Confirm this doesn't break ESM ordering (slice files import from `Store` already, so this should be fine).
2. **What to do with `<env>/.session/` after migration.** Strictly: keep it as `<env>/.session/Store/` only, remove everything else. Conservative alternative: rename the legacy tree to `<env>/.session-legacy-pre-b26755/` for one release, so users can recover if migration drops data unexpectedly. Suggest going conservative for the first release.
3. **Per-instance Graph slice.** `Graphs/store/graphInstance/slice.ts` is instantiated per graph at runtime — its `restoreSession` is per-instance, not per-module-import. Confirm the workspace lookup is read at slice-creation time, not cached at module-import time, so a workspace switch is correctly reflected by the next graph instance.
4. **`SVG` path mangling.** `SVG/store/slice.ts` does `state.path.replaceAll("/", "-")` to flatten paths into filenames. Re-confirm this still produces correct keys under the new prefix (no reason it shouldn't — the prefix is added by the storage facade, not the slice).
5. **Coordination with `2026-05-12-528e7f-e2e-speedups` item 1.** This change is the prerequisite. After it lands, item 1's "rehydrate on workspace switch" becomes straightforward: every slice re-runs its `restoreSession()` using the new workspace's prefix. The two should not land in the same PR — measure first.

## Security

Limited. The new `forWorkspace(name)` facade must validate `name` against the existing `getAbsPath` boundary check ([electron/main/storage.ts:34-45](webapp/electron/main/storage.ts#L34-L45)) to prevent path traversal (`name = "../other-env"`). The current `getAbsPath` already enforces `absPath.startsWith(HOME)`, so adding the `workspaces/<name>/` prefix routes through the same check — but we should explicitly test a malicious `name` ends up rejected (or sanitize in `forWorkspace` itself by stripping `/`, `\`, `..`). No new IPC channels; no widening of what the renderer can reach on disk.

## Performance

Neutral to slightly positive.

- Read/write cost is identical (one extra path component). On Linux/Electron the syscall difference is unmeasurable.
- Boot time: same — slices still do one `readFile` each. The one-time migration adds work on the first boot after upgrade, proportional to total session size; for typical envs this is well under 100ms.
- Soft workspace switch (once item 1 of the speedups plan lands on top of this change) goes from ~2–4s page reload to one async pass of `restoreSession()` per slice — back-of-envelope ~100–300ms for typical workspaces. This is the real perf payoff and the reason for sequencing this change first.
