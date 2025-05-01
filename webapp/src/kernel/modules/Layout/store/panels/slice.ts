import { createSlice } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../../constants";
import {
  collapseSettings,
  openDetails,
  expandSettings,
  closeDetails,
} from "./actions";
import { initialState, PanelsState } from "./state";

const storage = window.electron.storage;
storage.ensureDir(".session/Layout/panels");

function persistState(state: PanelsState) {
  storage.writeBlob(".session/Layout/panels/state.js", new Blob([JSON.stringify(state)]), { encoding: "utf-8" });
  return state;
}

const slice = createSlice({
  name: MODULE_NAME,
  initialState: initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(expandSettings, (state: PanelsState) =>
      persistState({
        ...state,
        settings: { ...state.settings, state: "expanded" },
      })
    );
    builder.addCase(collapseSettings, (state: PanelsState) =>
      persistState({
        ...state,
        settings: { ...state.settings, state: "collapsed" },
      })
    );

    builder.addCase(openDetails, (state: PanelsState) =>
      persistState({
        ...state,
        details: { ...state.details, state: "opened" },
      })
    );
    builder.addCase(closeDetails, (state: PanelsState) =>
      persistState({
        ...state,
        details: { ...state.details, state: "closed" },
      })
    );
  },
});

export default slice;
