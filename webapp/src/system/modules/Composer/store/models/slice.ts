import { createSlice } from "@reduxjs/toolkit";
import { ModelsMap } from "../../typings";
import { MODULE_NAME } from "../../constants";
import { modelsListed } from "./actions";


const initialState: ModelsMap = {
};

const storage = window.electron.storage;
storage.ensureDir(".session/Composer");

const slice = createSlice({
  name: MODULE_NAME,
  initialState: initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(modelsListed, (state, { payload }) => ({
      ...state,
      ...payload.reduce((acc, curr) => ({ ...acc, [curr.id]: curr }), {}),
    }));
  },
});

export default slice;
