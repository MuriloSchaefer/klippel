import { createSlice } from "@reduxjs/toolkit";

import {
  materialAdded,
  materialDeleted,
  materialsEvicted,
  materialsCatalogDeltaLoaded,
  materialsCatalogLoaded,
  materialsLoaded,
  materialStockUpdated,
  materialUpdated,
} from "./actions";
import { materialsWindowLoaded } from "./actions";
import type { MaterialsState } from "./state";
import {
  applyCatalogDelta,
  applyCatalogWindow,
  catalogToMaterialsState,
} from "./catalogAdapter";

const slice = createSlice({
  name: "materialsSlice",
  initialState: {} as MaterialsState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(materialsLoaded, (state, { payload }) => ({
      ...state,
      ...payload,
    }));
    builder.addCase(materialsCatalogLoaded, (_state, { payload }) =>
      catalogToMaterialsState(payload),
    );
    // One page of the catalog. Merges — a page extends the mirror rather than
    // replacing it — except on `reset`, which is the workspace-switch case
    // where the previous workspace's rows must not survive.
    builder.addCase(materialsWindowLoaded, (state, { payload }) =>
      applyCatalogWindow(state, payload),
    );
    // The normal path once a workspace is open: re-derive only the rows that
    // moved. Returns the same state reference when nothing did.
    builder.addCase(materialsCatalogDeltaLoaded, (state, { payload }) =>
      applyCatalogDelta(state, payload),
    );
    builder.addCase(materialAdded, (state, { payload }) => ({
      ...state,
      [String(payload.id)]: payload,
    }));
    builder.addCase(materialUpdated, (state, { payload }) => ({
      ...state,
      [payload.id]: payload.material,
    }));
    builder.addCase(materialStockUpdated, (state, { payload }) => {
      const current = state[payload.id];
      if (!current) return state;
      return {
        ...state,
        [payload.id]: { ...current, stock: payload.stock },
      };
    });
    builder.addCase(materialDeleted, (state, { payload }) => {
      const { [payload.id]: _removed, ...rest } = state;
      return rest;
    });
    // Eviction is the mirror shrinking, not the catalog: the rows still
    // exist, they are just no longer worth the renderer's memory. Whoever
    // needs one next re-resolves it by id (`useMaterial` → the lazy path).
    builder.addCase(materialsEvicted, (state, { payload }) => {
      if (!payload.ids.length) return state;
      const next = { ...state };
      let removed = 0;
      for (const id of payload.ids) {
        if (id in next) {
          delete next[id];
          removed += 1;
        }
      }
      return removed ? next : state;
    });
  },
});

export default slice;
