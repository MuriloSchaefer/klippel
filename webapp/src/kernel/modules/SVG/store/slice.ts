import { createSlice } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../constants";
import { fetchSVG, loadSVG, SVGFetched } from "./actions";
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
            ...newSVGState,
            path,
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
            content,
            progress: 'completed',
          },
        },
      })
    );
  },
});

export default slice;
