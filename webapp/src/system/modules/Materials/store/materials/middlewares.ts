import { createListenerMiddleware } from "@reduxjs/toolkit";
import {
  peersRefreshed,
  workspaceSelected,
} from "@kernel/modules/Store/actions";
import {
  addMaterial,
  deleteMaterial,
  loadMaterials,
  loadMaterialsCatalog,
  materialAdded,
  materialDeleted,
  materialsCatalogLoaded,
  materialStockUpdated,
  materialTypeVersionRegistered,
  materialUpdated,
  registerMaterialTypeVersion,
  updateMaterial,
  updateMaterialStock,
} from "./actions";
import {
  materialDtoToState,
  materialStateToDto,
} from "./catalogAdapter";

const materialsApi = () =>
  (window as unknown as { electron?: { jazz?: { materials?: any } } }).electron
    ?.jazz?.materials;

const middlewares = createListenerMiddleware();
middlewares.startListening({
  actionCreator: loadMaterials,
  effect: async (_action, { dispatch }) => {
    // The renderer no longer seeds the catalog from a hard-coded mock.
    // Catalog data lives in the workspace's Jazz SQLite store and is
    // populated either by user edits or by importing the bundled xlsx
    // fixture (`public/materials/materials.xlsx`) through the import UI.
    // Boot just reads whatever is already persisted.
    dispatch(loadMaterialsCatalog());
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
    dispatch(loadMaterialsCatalog());
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
    dispatch(loadMaterialsCatalog());
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
  effect: async ({ payload }, { dispatch, getState }) => {
    const api = materialsApi();
    if (!api) return;
    await api.updateMaterial(payload);
    // Re-read the affected material from the catalog so suppliers /
    // industry edges resolve correctly.
    const snapshot = await api.load();
    const dto = snapshot.materials[payload.id];
    if (!dto) return;
    const edges = Object.values(snapshot.edges);
    dispatch(
      materialUpdated({
        id: payload.id,
        material: materialDtoToState(dto, edges as any),
      }),
    );
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
