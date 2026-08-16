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
    // Merged, not replaced — except on `reset`. See the matching case in
    // `industries/slice.ts` for why: a page that came back without
    // organizations (an unresolved sub-record) would otherwise empty the
    // slice, and absence in a page means "not sent", never "deleted".
    builder.addCase(materialsWindowLoaded, (state, { payload }) => {
      const incoming = (payload.sellers ?? {}) as SellersState;
      if (payload.reset) return incoming;
      return Object.keys(incoming).length ? { ...state, ...incoming } : state;
    });
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
