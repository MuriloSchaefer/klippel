import { createSlice } from "@reduxjs/toolkit";
import _ from "lodash";
import {
  storeSVG,
  createProxy,
  updateProxy,
} from "./actions";
import { SVGModuleState } from "./state";

const initialState: SVGModuleState = {
  svgs: {},
};

export const SVGModuleSlice = createSlice({
  name: "SVGModule",
  initialState: initialState,
  reducers: {},
  // The `extraReducers` field use actions created outside the slice, therefore we can add proper naming
  extraReducers: (builder) => {
    builder
      .addCase(
        storeSVG,
        (state: SVGModuleState, { payload: { path, raw } }) => ({
          ...state,
          svgs: {
            ...state.svgs,
            [path]: {
              path,
              DOMid: _.uniqueId("svg_"),
              proxies: {},
              raw,
            }
          },
        })
      )
      .addCase(
        createProxy,
        (state: SVGModuleState, { payload: { path, proxy } }) => ({
          ...state,
          svgs: {
            ...state.svgs,
            [path]: {
              ...state.svgs[path],
              proxies: {
              ...state.svgs[path].proxies,
              [proxy.id]: proxy
              },
            }
          },
        })
      )
      .addCase(
        updateProxy,
        (state: SVGModuleState, { payload: { path, proxy } }) => ({
          ...state,
          svgs: {
            ...state.svgs,
            [path]: {
              ...state.svgs[path],
              proxies: {
              ...state.svgs[path].proxies,
              [proxy.id]: proxy
              },
            }
          },
        })
      )
  },
});

export default SVGModuleSlice.reducer;
