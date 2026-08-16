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
    // Organizations are bounded by how many exist, not by catalog size, so a
    // page carries them whole and can be *merged* wholesale.
    //
    // Merged, not replaced — except on `reset`, where the client is starting
    // over and entries from the previous workspace must not survive.
    //
    // Replacing on every page made every window answer authoritative about
    // organizations, including about their *absence*: any answer that came
    // back without them emptied the slice, and every material lost its
    // industry label until a good load landed. A page is authoritative about
    // materials, never about which organizations exist — absence in a page
    // means "not sent". (The projection can legitimately come back empty:
    // the catalog resolve set catches sub-record errors and yields nothing
    // for a record that did not resolve.)
    builder.addCase(materialsWindowLoaded, (state, { payload }) => {
      const incoming = (payload.industries ?? {}) as IndustriesState;
      if (payload.reset) return incoming;
      return Object.keys(incoming).length ? { ...state, ...incoming } : state;
    });
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
