import { createSlice } from "@reduxjs/toolkit";
import { ComposerModuleState } from "../typings";
import { MODULE_NAME } from "../constants";
import modelsSlice from "./models/slice";

const storage = window.electron.storage;
storage.ensureDir(".session/Composer");

const slice = createSlice({
  name: MODULE_NAME,
  initialState: {
    models: modelsSlice.getInitialState(),
  } as ComposerModuleState,
  reducers: {},
  extraReducers: (builder) => {

    builder.addDefaultCase((state, action) => ({
      ...state,
      models: modelsSlice.reducer(state.models, action),
    }));
  },
});

export default slice;
