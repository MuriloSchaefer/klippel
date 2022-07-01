import { createSlice } from "@reduxjs/toolkit";

import { UIState } from "./state";

import { startSVGLoad, SVGLoaded, parseParts } from "./actions";

const UIInitialState: UIState = {
  leftPanel: {
    isOpen: true,
  },
  rightPanel: {
    isOpen: false,
    selectedPartId: null,
  },
  viewport: {
    loadingSVG: false,
    parsing: {
      parts: false,
      mannequin: false,
      annotations: false,
    },
    graphId: null,
  },
};

export const composerSlice = createSlice({
  name: "composer",
  initialState: UIInitialState,
  reducers: {},
  // The `extraReducers` field use actions created outside the slice, therefore we can add proper naming
  extraReducers: (builder) => {
    builder
      .addCase(startSVGLoad, (state: UIState) => ({
        ...state,
        viewport: {
          ...state.viewport,
          loadingSVG: true,
        },
      }))
      .addCase(SVGLoaded, (state: UIState) => ({
        ...state,
        viewport: {
          ...state.viewport,
          loadingSVG: false,
        },
      }))
      .addCase(parseParts, (state: UIState) => ({
        ...state,
        viewport: {
          ...state.viewport,
          parsing: {
            ...state.viewport.parsing,
            parts: true,
          },
        },
      }));
  },
});

export default composerSlice.reducer;
