import { createSlice, SliceCaseReducers } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../../../constants";
import { ViewportGroups } from "../state";
import { createGroup } from "./actions";

const storage = window.electron.storage;
storage.ensureDir(`.session/Layout/viewPortManager/.groups`);
const persistState = (state: { name: string; color: string }) => {
    storage.writeBlob(
      `.session/Layout/viewPortManager/.groups/${state.name}.js`,
      new Blob([JSON.stringify(state)]),
      { encoding: "utf-8" }
    );
    return state;
}

const slice = createSlice<
  ViewportGroups,
  SliceCaseReducers<ViewportGroups>,
  string
>({
  name: `${MODULE_NAME}ViewportsGroups`,
  initialState: {},
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(createGroup, (state, { payload }) => {
      storage.ensureDir(`.session/Layout/viewPortManager/.groups`);
      return {
        ...state,
        [payload.name]: persistState({ name: payload.name, color: payload.color }),
      };
    });
  },
});

export default slice;
