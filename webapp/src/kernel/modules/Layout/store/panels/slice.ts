import { createSlice } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../../constants";
import {
  collapseSettings,
  openDetails,
  expandSettings,
  closeDetails,
} from "./actions";
import { initialState, PanelsState } from "./state";

const slice = createSlice({
  name: MODULE_NAME,
  initialState: initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(expandSettings, (state: PanelsState) => ({
      ...state,
      settings: { ...state.settings, state: "expanded" },
    }));
    builder.addCase(collapseSettings, (state: PanelsState) => ({
      ...state,
      settings: { ...state.settings, state: "collapsed" },
    }));

    builder.addCase(openDetails, (state: PanelsState) => ({
      ...state,
      details: { ...state.details, state: "opened" },
    }));
    builder.addCase(closeDetails, (state: PanelsState) => ({
      ...state,
      details: { ...state.details, state: "closed" },
    }));
  },
});

export default slice;
