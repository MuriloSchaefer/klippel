---
id: 2026-05-16-932980
name: Models cutover to Jazz CoValues + explicit save flow
description: Composer's model storage moves from per-file JSON to Jazz ModelCoMap; viewport save button becomes an explicit commit with a required message.
status: partially implemented
modules: [Store, Composer]
---

## Context

Composer used to persist models as per-model JSON trees under `workspaces/{ws}/Models/{id}/{graph,model,description}.json` plus a sibling `*.svg`. With the kernel-side Jazz foundation in place (see [Store change doc](../../../../kernel/modules/Store/docs/changes/2026-05-16-932980-jazz-foundation-and-models-migration.md)), Composer moves its model storage onto Jazz CoValues. This is plan-Phase-2 of [user-management.md](../../../../docs/user-management.md).

Two UX decisions shape this cutover:

1. **Explicit save, not auto-save.** The viewport-tray save icon already existed as a `console.log`-only placeholder. Users now click it, see a `PointerContainer` with a required commit-message field, and confirm. This bounds CRDT history growth (no save-per-keystroke) and gives a natural place to attach audit metadata once Phase 9 lands.
2. **Always-on Jazz for new workspaces.** No feature flag; legacy file-based workspaces are untouched.

## Change

### `saveModel` action + middleware

- [store/variations/actions.ts](../../store/variations/actions.ts) adds three actions:
  - `saveModel({ variationId, message })` — command, dispatched by the save button confirmation.
  - `modelSaved({ variationId, modelId, message })` — event.
  - `modelSaveFailed({ variationId, modelId, error })` — event.
- [store/variations/middlewares.ts](../../store/variations/middlewares.ts) gains a `saveModel` listener that:
  - Reads the current `GraphState` from `state.Graph.graphs[variationId]`.
  - Strips `searchResults` (derived, not persisted).
  - Best-effort `jazz.acquireLease(modelId)` — swallows if already held by us; the main-process lease check on `updateModelGraph` is authoritative.
  - Calls `jazz.updateModelGraph(modelId, JSON.stringify(persistable))`.
  - Dispatches `modelSaved` or `modelSaveFailed`.
  - **Commit message is not yet persisted as a CoValue** — echoed in the event for downstream listeners only. Phase 9 (audit) will move it onto a `CommitCoMap` or similar.

### `SaveModelButton` viewport component

- New file: [components/viewports/ModelViewport/SaveModelButton.tsx](../../components/viewports/ModelViewport/SaveModelButton.tsx).
- Replaces the placeholder save icon inside `ViewportNotificationsTray` in [ModelViewport/index.tsx](../../components/viewports/ModelViewport/index.tsx).
- UI shape:
  - Trigger: `SaveSharpIcon` wrapped in a `ShortcutHint` so the keybinding is discoverable (per CLAUDE.md's "shortcuts must ship with a visible hint" rule).
  - `PointerContainer` form: multiline `TextField` labeled "Mensagem" with a "Descreva brevemente o que mudou neste salvamento" helper. Required; the confirm button stays disabled until the message has non-whitespace content.
  - Confirm: dispatches `saveModel({ variationId, message: trimmed })` and resets the form.
- Trigger element carries `id="composer-save-model"` so the shortcut can find it via `document.getElementById(...).click()`.

### Save shortcut

- [kernelCalls.ts](../../kernelCalls.ts) registers `${MODULE_NAME}/ModelViewport/saveModel` bound to `Ctrl+S` in the `${MODULE_NAME}/ModelViewport` context. The action clicks the trigger, opening the `PointerContainer` — which then takes focus and waits for the message.

### `createModel` cutover

- [store/models/middlewares.ts](../../store/models/middlewares.ts) `createModel` listener:
  - Builds the initial `GraphState` with the seed `garment` node (same as before).
  - Calls `jazz.createModel({ id, name, graphJson, description: "" })` instead of three `storage.writeBlob` calls.
  - Falls back to early-return on failure (logged) — the file-based fallback is intentionally **removed** since the design says new workspaces are Jazz-only.

### `listModels` cutover

- The same file's `listModels` listener now calls `jazz.listModels()` and maps `ModelSummary[]` to the legacy `Model` shape (`{ id, name, description, svg: undefined, graph: '' }`). The `svg` / `graph` legacy file-path fields are left empty — they're not consumed anywhere meaningful after Phase 2b.

### `saveSession` still flushes the model list cache

- `.session/Composer/models/{id}.json` is **not** the source of truth — Jazz is. But the filesystem cache lets the slice rehydrate the rendered model list before the first `jazz.listModels()` round-trip resolves, so we keep it.
- The split: **workspace data** (graph, SVG, model content) lives in `jazz.sqlite`; **session-level cache** (rendered list, viewport state, panels) lives in `.session/`. `saveSession` continues to call `persistModelState` for each model in the rendered list. `listModels` then reconciles the cache against the CoValue tree on the next dispatch.

### `openModel` cutover (variations)

- [store/variations/middlewares.ts](../../store/variations/middlewares.ts):
  - Old path read `workspaces/{ws}/Models/{id}/graph.json` via `storage.readFile`.
  - New path calls `jazz.loadModel(model.id)`, parses `graphJson`, defaults missing `adjacencyList` + `searchResults`, dispatches `loadGraph`.
  - If `loaded.hasSvg`, also calls `jazz.loadModelSvg(model.id)` and dispatches `loadSVG` so the SVG slice hydrates.

### `uploadSVG` cutover (variations)

- The action stays — renderer still emits an `svgContent` string.
- Middleware now:
  1. Mounts the SVG in the SVG slice immediately (so the editor reflects the new file).
  2. Awaits `jazz.uploadModelSvg(modelId, svgContent)` — this transcodes to bytes and stores as `BinaryCoStream` attached to `ModelCoMap.svg`.
  3. Dispatches `svgUploaded`.

### Wire types

- [typings.ts](../../typings.ts) gains `ModelSummary`, `LoadedModel`, `EditLeaseSnapshot`, `CreateModelInput`. These are the DTOs that cross the IPC boundary; both `electron/main/jazz.ts` and `electron/preload/jazz.ts` import them from here so kernel infra stays free of Composer-internal shapes.

## Status notes

**Partially implemented.**

Done in this slice (2b):
- All five middleware cutovers (createModel, listModels, saveSession, openModel, uploadSVG).
- `SaveModelButton` + `Ctrl+S` shortcut.
- `saveModel` / `modelSaved` / `modelSaveFailed` actions.
- BinaryCoStream-backed SVG upload/download.

Pending (Phase 2c):
- Lease auto-renew on editor focus and release on close/idle (currently lease is best-effort acquired per save, never explicitly released; expires at 60s).
- Read-only banner shown to the non-holder when another peer holds the lease (`useEditLease` hook + banner component).
- DOMPurify sanitization for SVG bytes before mounting (security hardening from the plan's "content trust" section).
- Composer e2e test that exercises the save → reopen → verify flow (`tests/models-jazz.e2e.test.ts` in the plan).
- Persisting the commit message as a `CommitCoMap` next to the model (plan-Phase-9 audit).

Verified manually end-to-end:
- Create workspace via DevTools → workspace's `ModelsMap` is initialized.
- `jazz.createModel` writes a new `ModelCoMap` keyed in the record.
- `loadModel` returns the full payload; `listModels` returns summaries.
- `acquireLease` → `updateModelGraph` → `releaseLease` round-trips.
- Close + reopen the workspace → `loadModel` returns the latest `graphJson`, proving SQLite persistence.

## Security

- **Edit lease is not yet authoritative.** Main-process `updateModelGraph` rejects mutations when the lease is held by another account, but until plan-Phase-6 (Cedar receive-validator) lands, a sufficiently determined attacker with renderer code-execution could bypass the IPC and push raw CRDT mutations. Acceptable in this phase because there are no remote peers (`disallowRelay: true` by default).
- **No SVG sanitization yet.** The `uploadSVG` middleware accepts arbitrary SVG content from the renderer and writes it to a `BinaryCoStream`. On read it dispatches `loadSVG` with the unsanitized content. Until Phase 2c wires DOMPurify, do not load SVGs from untrusted sources. The renderer already uses `contextIsolation: true` so the blast radius of a hostile SVG is bounded.
- **No payload-size cap.** Graph JSON and SVG payloads cross IPC without a size limit. Phase 9 hardening introduces a 16 MiB cap per mutation.
- **Commit messages are not signed and not yet persisted.** They live in the dispatched event payload and never reach disk. There is no audit trail in this phase.
- The save button correctly disables confirm when the message is empty, blocking the trivially-bad case where a user clicks confirm without typing anything.

## Performance

- **Save is explicit-click only.** No debounce-on-keystroke, no auto-save interval. CRDT history grows one mutation per user-confirmed save, which is exactly what the plan's history-bloat guidance recommends.
- `openModel` now does one IPC round-trip for graph + optionally a second for SVG, replacing the old per-file disk reads. On a local SQLite-backed workspace this is faster in practice (single transaction vs. multiple `fs` opens) but introduces a serialization step (`JSON.stringify` of the full graph) on save.
- `saveModel` re-serializes the whole graph on every commit. For 500-node graphs this is ~10–50 KB; well within IPC limits and Jazz's chunking thresholds.
- `listModels` walks `Object.entries(workspace.models)` which is O(N) in models. Fine up to plan's 500-model budget.
- SVG upload writes through `BinaryCoStream.createFromArrayBuffer` which chunks internally. No benchmarks run; under ~1 MiB the overhead is negligible.
- No benchmarks captured for this slice. The Phase 3 metadata-load budget (`< 200ms` for 500 models) becomes the next perf gate once lazy hydration lands.
