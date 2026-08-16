import { createSlice } from "@reduxjs/toolkit";
import { initialState, SellersState } from "./state";
import {
  materialsCatalogDeltaLoaded,
  materialsCatalogLoaded,
  materialsWindowLoaded,
} from "../materials/actions";

const slice = createSlice({
  name: "sellersSlice",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(materialsCatalogLoaded, (_state, { payload }) =>
      payload.sellers as SellersState,
    );
    // Organizations come whole with every page — they are bounded by how
    // many exist, not by catalog size — so a page is authoritative for them
    // and replaces, exactly as a snapshot does.
    builder.addCase(materialsWindowLoaded, (_state, { payload }) =>
      payload.sellers as SellersState,
    );
    builder.addCase(materialsCatalogDeltaLoaded, (state, { payload }) => {
      // A full payload is authoritative and replaces, exactly as
      // `materialsCatalogLoaded` does. A delta only ever carries the entries
      // that changed, so it merges — absence means "unchanged", not "gone".
      if (payload.full) return payload.full.sellers as SellersState;
      if (!payload.sellers) return state;
      return { ...state, ...(payload.sellers as SellersState) };
    });
  },
});

export default slice;
