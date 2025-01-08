import { createSlice, SliceCaseReducers } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../../../constants";
import { ViewportGroups } from "../state";
import { createGroup } from "./actions";

const storage = window.electron.storage;

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
      storage.createDir(`.session/Layout/viewPortManager/.groups`);
      storage.write(
        `.session/Layout/viewPortManager/.groups/${payload.name}.js`,
        JSON.stringify({ name: payload.name, color: payload.color }),
        { encoding: "utf-8" }
      );
      return {
        ...state,
        [payload.name]: { name: payload.name, color: payload.color },
      };
    });
  },
});

export default slice;
