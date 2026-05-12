import { createSlice, Store } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../constants";
import { moduleStarted, saveSession } from "./actions";

import { loaderInitialState, LoaderState } from "./state";

import { workspaceStorage as storage } from "@kernel/modules/Store/workspaceScope";
storage.ensureDir(".session/Loader");

export const sessionSaver = (store: Store<LoaderState>) => () => {
  store.dispatch(saveSession());
};
export function persistState(state: LoaderState) {
  storage.writeBlob(".session/Loader/state.json", new Blob([JSON.stringify(state)]), {
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
      ({ ...state, modulesCount: state.modulesCount + 1 })
    );
  },
});

export default slice;
