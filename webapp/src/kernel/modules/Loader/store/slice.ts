import { createSlice } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../constants";
import { moduleStarted } from "./actions";

import { loaderInitialState, LoaderState } from "./state";

const storage = window.electron.storage;
storage.createDir(".session/Loader");

function persistState(state: LoaderState) {
  storage.write(".session/Loader/state.js", JSON.stringify(state), {
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
