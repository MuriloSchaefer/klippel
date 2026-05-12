import { createSlice } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../constants";
import modelsSlice from "./models/slice";
import variationsSlice from "./variations/slice";

import { workspaceStorage as storage } from "@kernel/modules/Store/workspaceScope";
storage.ensureDir(".session/Composer");

const slice = createSlice({
  name: MODULE_NAME,
  initialState: {
    models: modelsSlice.getInitialState(),
    variations: variationsSlice.getInitialState(),
  },
  reducers: {},
  extraReducers: (builder) => {

    builder.addDefaultCase((state, action) => ({
      ...state,
      models: modelsSlice.reducer(state.models, action),
      variations: variationsSlice.reducer(state.variations, action),
    }));
  },
});

export default slice;
