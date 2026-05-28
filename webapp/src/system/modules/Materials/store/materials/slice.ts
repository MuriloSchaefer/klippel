import { createSlice } from "@reduxjs/toolkit";

import {
  materialAdded,
  materialDeleted,
  materialsCatalogLoaded,
  materialsLoaded,
  materialStockUpdated,
  materialUpdated,
} from "./actions";
import type { MaterialsState } from "./state";
import { catalogToMaterialsState } from "./catalogAdapter";

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
  },
});

export default slice;
