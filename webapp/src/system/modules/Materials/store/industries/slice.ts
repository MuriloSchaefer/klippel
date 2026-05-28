import { createSlice } from "@reduxjs/toolkit";
import { initialState, IndustriesState } from "./state";
import { materialsCatalogLoaded } from "../materials/actions";

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
  },
});

export default slice;
