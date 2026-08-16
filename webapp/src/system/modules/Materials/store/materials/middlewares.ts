import { createListenerMiddleware } from "@reduxjs/toolkit";
import {
  peersRefreshed,
  workspaceSelected,
} from "@kernel/modules/Store/actions";
import {
  addMaterial,
  configureMaterialsResidency,
  deleteMaterial,
  ensureMaterialsLoaded,
  loadMaterials,
  loadMaterialsCatalog,
  loadMaterialsCatalogDelta,
  loadMaterialsOfType,
  loadMaterialsWindow,
  loadMoreMaterials,
  materialAdded,
  materialDeleted,
  materialsCatalogDeltaLoaded,
  materialsCatalogLoaded,
  materialsEvicted,
  materialsPinned,
  materialsUnpinned,
  materialsWindowLoaded,
  materialsWindowRequested,
  materialStockUpdated,
  materialTypeVersionRegistered,
  refreshMaterialsView,
  registerMaterialTypeVersion,
  searchMaterialsCatalog,
  sweepMaterialsResidency,
  unpinMaterials,
  updateMaterial,
  updateMaterialStock,
} from "./actions";
import {
  materialDtoToState,
  materialStateToDto,
} from "./catalogAdapter";
import {
  collectEvictable,
  forgetMaterials,
  getResidencyConfig,
  resetResidency,
  setResidencyConfig,
  touchMaterials,
} from "./residency";
import type { MaterialsModuleState } from "../state";
import { initialState as windowInitialState } from "../window/state";

const materialsApi = () =>
  (window as unknown as { electron?: { jazz?: { materials?: any } } }).electron
    ?.jazz?.materials;

type RootState = { Materials: MaterialsModuleState };

const windowState = (getState: () => unknown) =>
  (getState() as RootState).Materials?.window ?? windowInitialState;

/**
 * Materials the renderer must keep resident regardless of rank or query —
 * everything an open model references.
 *
 * Re-sent with **every** window request, not just the first: main re-pins on
 * each read, and a `reset` read that omitted them would evict rows the user
 * is currently looking at in a model.
 */
const pinnedIdsOf = (getState: () => unknown): string[] =>
  windowState(getState).pinnedIds;

const middlewares = createListenerMiddleware();
middlewares.startListening({
  actionCreator: loadMaterials,
  effect: async (_action, { dispatch }) => {
    // The renderer no longer seeds the catalog from a hard-coded mock.
    // Catalog data lives in the workspace's Jazz SQLite store and is
    // populated either by user edits or by importing the bundled xlsx
    // fixture (`public/materials/materials.xlsx`) through the import UI.
    // Boot just reads whatever is already persisted — one page of it.
    dispatch(loadMaterialsWindow());
  },
});

// ---- windowed reads --------------------------------------------------
//
// The renderer mirrors a page of the catalog, not the catalog. Three commands
// move that window: `loadMaterialsWindow` starts it over (cold open,
// workspace switch), `loadMoreMaterials` extends it (scroll),
// `searchMaterialsCatalog` re-aims it at a query. A fourth,
// `ensureMaterialsLoaded`, pulls in specific rows a model references without
// disturbing the view at all.

middlewares.startListening({
  actionCreator: loadMaterialsWindow,
  effect: async ({ payload }, { dispatch, getState }) => {
    const api = materialsApi();
    if (!api) return;
    if (typeof api.loadWindow !== "function") {
      // Preload predates the window channel (stale dev build). A full load is
      // slow at scale but correct, which beats an empty catalog.
      dispatch(loadMaterialsCatalog());
      return;
    }
    const pinnedIds = Array.from(
      new Set([...pinnedIdsOf(getState), ...(payload?.pinnedIds ?? [])]),
    );
    dispatch(materialsWindowRequested({ reason: "page" }));
    const result = await api.loadWindow({ pinnedIds, offset: 0, reset: true });
    dispatch(materialsWindowLoaded(result));
  },
});

middlewares.startListening({
  actionCreator: loadMoreMaterials,
  effect: async (_action, { dispatch, getState }) => {
    const api = materialsApi();
    if (!api?.loadWindow) return;
    const current = windowState(getState);
    // Guard both ends: the grid fires this from a scroll handler, which can
    // fire several times before the first answer lands.
    if (current.loading || !current.hasMore) return;
    dispatch(materialsWindowRequested({ reason: "page" }));
    const result = await api.loadWindow({
      pinnedIds: current.pinnedIds,
      query: current.query || undefined,
      offset: current.nextOffset,
      limit: current.limit,
    });
    dispatch(materialsWindowLoaded(result));
  },
});

middlewares.startListening({
  actionCreator: refreshMaterialsView,
  effect: async (_action, { dispatch, getState }) => {
    const api = materialsApi();
    if (!api?.loadWindow) return;
    const current = windowState(getState);
    if (!current.initialized) return;
    // Re-request from the top, sized to what is already resident, so the user
    // keeps the depth they scrolled to. Rounded up to a whole page so the
    // paging cursor stays on a page boundary. Main clamps at its own ceiling,
    // so a user who has paged past it is walked back to it and can page
    // forward again — a bounded refresh beats an unbounded one.
    const span = Math.max(
      current.limit,
      Math.ceil(current.resultIds.length / current.limit) * current.limit,
    );
    dispatch(materialsWindowRequested({ reason: "page" }));
    const result = await api.loadWindow({
      pinnedIds: current.pinnedIds,
      query: current.query || undefined,
      offset: 0,
      limit: span,
    });
    dispatch(materialsWindowLoaded(result));
  },
});

middlewares.startListening({
  actionCreator: searchMaterialsCatalog,
  effect: async ({ payload }, { dispatch, getState }) => {
    const api = materialsApi();
    if (!api?.loadWindow) return;
    dispatch(materialsWindowRequested({ reason: "search" }));
    // Search runs in main against the whole catalog. Filtering in the
    // renderer would only ever search the resident page, which is precisely
    // the rows the user can already see.
    const result = await api.loadWindow({
      pinnedIds: pinnedIdsOf(getState),
      query: payload.query,
      offset: 0,
    });
    dispatch(materialsWindowLoaded(result));
  },
});

/**
 * Type-scoped load, de-duplicated per type for the lifetime of the mirror.
 *
 * Every mounted picker asks on mount, and there are many — one per material
 * node in an open model. Without this guard a model with 20 nodes of the same
 * type would issue 20 identical whole-type reads on open.
 *
 * Cleared on `reset`, which is the only event that can invalidate it: the
 * mirror was replaced, so a type loaded into the old one is not in this one.
 */
const loadedTypes = new Set<string>();

middlewares.startListening({
  actionCreator: loadMaterialsOfType,
  effect: async ({ payload }, { dispatch, getState }) => {
    const api = materialsApi();
    if (!api?.loadWindow || !payload.type) return;
    if (loadedTypes.has(payload.type)) return;
    loadedTypes.add(payload.type);
    try {
      const result = await api.loadWindow({
        type: payload.type,
        pinnedIds: pinnedIdsOf(getState),
        // One page, sized to the ceiling main enforces. A type with more
        // members than this is a catalog no picker should be rendering as a
        // flat list anyway — that is a search box, not a dropdown.
        limit: 1_000,
      });
      dispatch(materialsWindowLoaded(result));
    } catch (err) {
      // Retryable: leaving it marked loaded would strand the picker empty.
      loadedTypes.delete(payload.type);
      console.error("[Materials] loadMaterialsOfType failed", err, payload.type);
    }
  },
});

middlewares.startListening({
  actionCreator: materialsWindowLoaded,
  effect: async ({ payload }) => {
    if (payload.reset) loadedTypes.clear();
  },
});

/**
 * Ids whose by-id resolve is in flight, or has already come back empty.
 *
 * Two things dispatch `ensureMaterialsLoaded` per material now — an open
 * model, and any component reading a material that is not resident — and a
 * grid of rows all missing the same id would otherwise issue one IPC each.
 * Ids that do not exist in the catalog are the worse case: they come back
 * unresolved, so without a record the next render asks again, forever.
 *
 * Cleared on `reset`, the only event that can change the answer.
 */
const resolvingIds = new Set<string>();

middlewares.startListening({
  actionCreator: ensureMaterialsLoaded,
  effect: async ({ payload }, { dispatch, getState }) => {
    const api = materialsApi();
    if (!api?.loadWindow) return;
    const ids = payload.ids.filter(Boolean);
    if (!ids.length) return;
    // Pin first, unconditionally — but only for an owner that can let go
    // again. A row already resident still has to be pinned, or the next
    // `reset` read would evict a material the open model is rendering.
    if (payload.owner) dispatch(materialsPinned({ ids, owner: payload.owner }));

    const state = (getState() as RootState).Materials;
    const missing = ids.filter(
      (id) => !state?.materials?.[id] && !resolvingIds.has(id),
    );
    if (!missing.length) return;
    for (const id of missing) resolvingIds.add(id);
    dispatch(materialsWindowRequested({ reason: "ids" }));
    try {
      const result = await api.loadWindow({
        ids: missing,
        pinnedIds: payload.owner ? ids : [],
      });
      dispatch(materialsWindowLoaded(result));
      // Anything the answer did carry is resident now; anything it did not
      // does not exist, and stays marked so the next render does not re-ask.
      for (const id of Object.keys(result.materials ?? {})) resolvingIds.delete(id);
    } catch (err) {
      for (const id of missing) resolvingIds.delete(id);
      console.error("[Materials] ensureMaterialsLoaded failed", err, missing);
    }
  },
});

middlewares.startListening({
  actionCreator: unpinMaterials,
  effect: async ({ payload }, { dispatch }) => {
    dispatch(materialsUnpinned({ owner: payload.owner }));
  },
});

// ---- residency -------------------------------------------------------
//
// Everything above only ever *adds* to the mirror. This is the other half:
// the mirror gives rows back when nothing needs them, so browsing a large
// catalog costs a bounded amount of renderer memory instead of converging on
// "the whole catalog, eventually".

/**
 * What the mirror must keep regardless of when it was last read: the rows
 * open tabs reference.
 *
 * **Not the whole view.** `resultIds` is the *list*, and it grows with every
 * page the user scrolls through — protecting all of it meant a browse session
 * ended up protecting the entire catalog, which is precisely the state the
 * sweep exists to prevent (a live app was found holding 437 of 437 rows with
 * nothing evictable). What is "on screen" is a much smaller thing, and only
 * the grid knows it: `TableView` retains the rows it renders, plus a page of
 * lead either way, and the rest of the view is free to be reclaimed and comes
 * back as placeholders that resolve when scrolled to.
 */
const protectedIdsOf = (getState: () => unknown): Set<string> =>
  new Set(windowState(getState).pinnedIds);

middlewares.startListening({
  actionCreator: sweepMaterialsResidency,
  effect: async (_action, { dispatch, getState }) => {
    const materials = (getState() as RootState).Materials?.materials;
    if (!materials) return;
    const evictable = collectEvictable(
      Object.keys(materials),
      protectedIdsOf(getState),
    );
    if (!evictable.length) return;
    forgetMaterials(evictable);
    for (const id of evictable) resolvingIds.delete(id);
    // A type marked loaded is a claim that its rows are resident. Eviction
    // can have just falsified that, and the guard would otherwise refuse to
    // reload the type — leaving the next picker to mount with no options.
    loadedTypes.clear();
    dispatch(materialsEvicted({ ids: evictable }));
  },
});

/**
 * The sweep timer. One per renderer, not one per subscription — it is a
 * property of the mirror, not of any component.
 */
let sweepTimer: ReturnType<typeof setInterval> | undefined;

const startSweeping = (dispatch: (action: unknown) => void) => {
  if (sweepTimer !== undefined) clearInterval(sweepTimer);
  sweepTimer = setInterval(
    () => dispatch(sweepMaterialsResidency()),
    getResidencyConfig().sweepIntervalMs,
  );
};

middlewares.startListening({
  actionCreator: configureMaterialsResidency,
  effect: async ({ payload }, { dispatch }) => {
    setResidencyConfig(payload);
    // The cadence may have changed, and `setInterval` cannot be retuned.
    if (sweepTimer !== undefined) startSweeping(dispatch as never);
  },
});

middlewares.startListening({
  actionCreator: loadMaterials,
  effect: async (_action, { dispatch }) => {
    startSweeping(dispatch as never);
  },
});

middlewares.startListening({
  actionCreator: workspaceSelected,
  effect: async (_action, { dispatch }) => {
    // The mirror is about to be replaced: access history describes rows that
    // are no longer there, and a by-id resolve for the old catalog says
    // nothing about the new one.
    resetResidency();
    resolvingIds.clear();
    startSweeping(dispatch as never);
  },
});

middlewares.startListening({
  actionCreator: materialsWindowLoaded,
  effect: async ({ payload }, { dispatch }) => {
    if (payload.reset) {
      resetResidency();
      resolvingIds.clear();
    }
    // Arrival counts as an access. Without this a freshly loaded row is
    // "never read" for the instant between the reducer and the consumer's
    // retain effect — and the sweep below would reclaim the row the caller
    // just asked for.
    touchMaterials(Object.keys(payload.materials ?? {}));
    // A page just grew the mirror. Sweeping here — rather than only on the
    // timer — is what keeps a long browse from accumulating every page it
    // passed through, without waiting a whole interval to notice.
    dispatch(sweepMaterialsResidency());
  },
});

middlewares.startListening({
  actionCreator: loadMaterialsCatalog,
  effect: async (_action, { dispatch }) => {
    const api = materialsApi();
    if (!api) return;
    const snapshot = await api.load();
    dispatch(materialsCatalogLoaded(snapshot));
  },
});

// Change ticks answer with a delta, not a reload. Main keeps a per-renderer
// shadow of the catalog and returns only what moved since this renderer last
// asked; `{ full }` comes back when there is no usable "since" (first tick,
// workspace switch), and is applied exactly like a snapshot load.
//
// The full reload used to run on every tick: whole-catalog projection, multi-MB
// structured clone, and a full re-derive in the reducer — per edit, per
// renderer. During an xlsx import that never drained, because chunk writes tick
// faster than the rebuild completes
// (docs/analysis/materials-catalog-lag-analysis.md, F2).
middlewares.startListening({
  actionCreator: loadMaterialsCatalogDelta,
  effect: async (_action, { dispatch, getState }) => {
    const api = materialsApi();
    if (!api) return;
    if (typeof api.loadDelta !== "function") {
      // Preload predates the delta channel (stale dev build). Fall back rather
      // than going deaf to catalog changes.
      dispatch(loadMaterialsCatalog());
      return;
    }
    const before = windowState(getState);
    const delta = await api.loadDelta();
    dispatch(materialsCatalogDeltaLoaded(delta));

    // The delta is scoped to what this client mirrors, so a change to a row
    // *outside* the window is invisible in it — and that row may be exactly
    // the one that now matches the active query, or the new material an
    // import just wrote. A windowed client cannot tell the difference without
    // asking, so it asks, in two cases:
    //
    //   - a query is active. Its result set is a function of the whole
    //     catalog, so any tick can change it. One pass per debounce window,
    //     only while the search box is non-empty.
    //   - the catalog size moved. A plain edit does not move it and costs
    //     nothing here; an add or a delete does, and in the browse view those
    //     rows belong on a page.
    //
    // Both re-read the span the user has already paged to rather than the
    // catalog, so scroll depth survives and an import's chunk writes cost one
    // bounded page per debounce window — not the full reload that never
    // drained (docs/analysis/materials-catalog-lag-analysis.md, F2).
    const sizeMoved = delta.total !== undefined && delta.total !== before.total;
    if (before.query || sizeMoved) dispatch(refreshMaterialsView());
  },
});

// Workspace switch (selectWorkspace → ...rehydrators → workspaceSelected)
// rehydrates the materials slice from `.session/Materials/materials/*.json`,
// which is per-workspace disk state. A freshly-created or freshly-joined
// workspace has no `.session/Materials/...` files, so the disk rehydrator
// returns an empty slice — but the *Jazz* catalog for the new workspace
// already contains data (own catalog if owner, synced catalog if joiner).
// Force a catalog refetch so the slice mirrors the live Jazz state.
// Same pattern Converter uses for its conversion graph (Converter/store/middlewares.ts).
middlewares.startListening({
  actionCreator: workspaceSelected,
  effect: async (_action, { dispatch }) => {
    // Resets the mirror: the previous workspace's rows must not survive the
    // switch. Its pins are carried into the request but main drops the ones
    // absent from the new catalog, and `reset` replaces the pin set with what
    // came back — so stale pins clear themselves.
    dispatch(loadMaterialsWindow());
  },
});

// Kernel-level "refresh from peers" — the system-tray indicator
// dispatches `Store.refreshFromPeers`; the Store middleware re-opens
// the active workspace in the main process and then emits
// `peersRefreshed`. Listening on the *event* (not the command) is
// what guarantees the workspace handle is freshly resolved by the
// time we call `api.load()` — otherwise the load reads through a
// stale resolved subtree and peer deltas don't show up.
middlewares.startListening({
  actionCreator: peersRefreshed,
  effect: async (_action, { dispatch }) => {
    dispatch(loadMaterialsWindow());
  },
});

middlewares.startListening({
  actionCreator: addMaterial,
  effect: async ({ payload }, { dispatch }) => {
    const api = materialsApi();
    if (!api) {
      console.warn(
        "[Materials] addMaterial: window.electron.jazz.materials missing — preload may be stale",
      );
      return;
    }
    const edges = [
      {
        id: `conformsTo:${payload.material.id}`,
        type: "conformsTo",
        sourceId: payload.material.id,
        targetId: payload.typeVersion,
      },
      ...(payload.industryId
        ? [
            {
              id: `manufacturedBy:${payload.material.id}`,
              type: "manufacturedBy",
              sourceId: payload.material.id,
              targetId: payload.industryId,
            },
          ]
        : []),
      ...((payload.sellerIds ?? []).map((s) => ({
        id: `suppliedBy:${payload.material.id}:${s}`,
        type: "suppliedBy",
        sourceId: payload.material.id,
        targetId: s,
      }))),
    ];
    // Await the IPC before the success event so a duplicate-id or
    // validation rejection in the main process never lands in Redux.
    // The main process returns the server-confirmed material DTO; we
    // use that (not the unconfirmed payload) as the slice's source of
    // truth.
    try {
      const confirmed = (await api.addMaterial(payload)) ?? payload.material;
      dispatch(materialAdded(materialDtoToState(confirmed, edges)));
    } catch (err) {
      console.error("[Materials] addMaterial IPC failed", err, payload);
    }
  },
});

middlewares.startListening({
  actionCreator: updateMaterial,
  effect: async ({ payload }, { dispatch }) => {
    const api = materialsApi();
    if (!api) return;
    await api.updateMaterial(payload);
    // Re-read through the delta channel rather than re-fetching the whole
    // catalog for one row. The delta carries this material *and* its current
    // edges, so suppliers / industry still resolve correctly — and because
    // computing it advances this renderer's shadow, the catalog tick the write
    // provokes arrives empty instead of re-applying the same change a second
    // time (docs/analysis/materials-catalog-lag-analysis.md, F2).
    dispatch(loadMaterialsCatalogDelta());
  },
});

middlewares.startListening({
  actionCreator: updateMaterialStock,
  effect: async ({ payload }, { dispatch }) => {
    const api = materialsApi();
    if (!api) return;
    await api.updateMaterialStock(payload);
    dispatch(materialStockUpdated(payload));
  },
});

middlewares.startListening({
  actionCreator: deleteMaterial,
  effect: async ({ payload }, { dispatch }) => {
    const api = materialsApi();
    if (!api) return;
    await api.deleteMaterial(payload.id);
    dispatch(materialDeleted(payload));
  },
});

middlewares.startListening({
  actionCreator: registerMaterialTypeVersion,
  effect: async ({ payload }, { dispatch }) => {
    const id = `${payload.name}@${payload.version}`;
    // Optimistic local update — the materialTypes slice reflects the
    // new version immediately so the Add-material form (and any
    // selector) can use it without waiting for the Jazz round-trip.
    // If the IPC call fails the catalog will diverge from local
    // state, but the next workspace open re-seeds from the
    // authoritative `MaterialCatalogCoMap`.
    dispatch(
      materialTypeVersionRegistered({
        id,
        name: payload.name,
        version: payload.version,
        schemaJson: payload.schemaJson,
      }),
    );
    const api = materialsApi();
    if (!api) return;
    try {
      await api.registerTypeVersion({
        id,
        schemaJson: payload.schemaJson,
        predecessorId: payload.predecessorId,
      });
    } catch (err) {
      console.warn(
        "[Materials] registerTypeVersion IPC failed; local state diverges from catalog",
        err,
      );
    }
  },
});

export default middlewares;
