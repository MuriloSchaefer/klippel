import { createSlice } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../constants";
import { moduleStarted } from "./actions";

import { loaderInitialState, LoaderState } from "./state";

const storage = window.electron.storage;
storage.ensureDir(".session/Loader");

function persistState(state: LoaderState) {
  storage.writeBlob(".session/Loader/state.js", new Blob([JSON.stringify(state)]), {
    encoding: "utf-8",
  });
  return state;
}

const slice = createSlice({
  name: MODULE_NAME,
  initialState: loaderInitialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(moduleStarted, (state: LoaderState) =>
      persistState({ ...state, modulesCount: state.modulesCount + 1 })
    );
  },
});

export default slice;
