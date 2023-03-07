import { createSlice } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../constants";
import { addProxy, fetchSVG, loadSVG, SVGFetched } from "./actions";
import { initialState, SVGModuleState, newSVGState } from "./state";

const slice = createSlice({
  name: MODULE_NAME,
  initialState: initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(
      loadSVG,
      (state: SVGModuleState, { payload: { path } }) => ({
        ...state,
        svgs: {
          [path]: {
            path,
            ...newSVGState,
          },
        },
      })
    );
    builder.addCase(
      fetchSVG,
      (state: SVGModuleState, { payload: { path } }) => ({
        ...state,
        svgs: {
          [path]: {
            ...state.svgs[path],
            progress: 'started',
          },
        },
      })
    );
    builder.addCase(
      SVGFetched,
      (state: SVGModuleState, { payload: { path, content } }) => ({
        ...state,
        svgs: {
          [path]: {
            ...state.svgs[path],
            progress: 'completed',
            content,
          },
        },
      })
    );
    builder.addCase(
      addProxy,
      (state: SVGModuleState, { payload: { path, proxySet, id, styles} }) => ({
        ...state,
        svgs: {
          [path]: {
            ...state.svgs[path],
            proxies: {
              ...state.svgs[path].proxies,
              [proxySet]: {
                ...state.svgs[path].proxies[proxySet],
                [id]: styles
              }
            },
          },
        },
      })
    );
  },
});

export default slice;
