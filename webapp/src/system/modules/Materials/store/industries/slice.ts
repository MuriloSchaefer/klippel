import { createSlice } from "@reduxjs/toolkit";
import { initialState, IndustriesState } from "./state";
import {
  materialsCatalogDeltaLoaded,
  materialsCatalogLoaded,
  materialsWindowLoaded,
} from "../materials/actions";

const slice = createSlice({
  name: "industriesSlice",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(materialsCatalogLoaded, (_state, { payload }) =>
      // Snapshot is authoritative — replace, don't merge. Stale entries
      // from a previous workspace must not leak.
      payload.industries as IndustriesState,
    );
    // Organizations come whole with every page — they are bounded by how
    // many exist, not by catalog size — so a page is authoritative for them
    // and replaces, exactly as a snapshot does.
    builder.addCase(materialsWindowLoaded, (_state, { payload }) =>
      payload.industries as IndustriesState,
    );
    builder.addCase(materialsCatalogDeltaLoaded, (state, { payload }) => {
      // A full payload is authoritative and replaces, exactly as
      // `materialsCatalogLoaded` does. A delta only ever carries the entries
      // that changed, so it merges — absence means "unchanged", not "gone".
      if (payload.full) return payload.full.industries as IndustriesState;
      if (!payload.industries) return state;
      return { ...state, ...(payload.industries as IndustriesState) };
    });
  },
});

export default slice;
