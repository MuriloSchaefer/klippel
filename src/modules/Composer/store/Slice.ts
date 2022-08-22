import { createSlice } from "@reduxjs/toolkit";

import { viewportAdded, viewportSelected } from "@kernel/layout/ations";
import { UIState } from "./state";

import {
  startSVGLoad,
  SVGLoaded,
  parseParts,
  partSelectedEvent,
} from "./actions";

const UIInitialState: UIState = {
  leftPanel: {},
  rightPanel: {
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
      .addCase(viewportAdded, (state: UIState, action) => ({
        leftPanel: {},
        rightPanel: {
          selectedPartId: null,
        },
        viewport: {
          ...state.viewport,
          graphId: action.payload.id,
        },
      }))
      .addCase(viewportSelected, (state: UIState, action) => ({
        leftPanel: {},
        rightPanel: {
          selectedPartId: null,
        },
        viewport: {
          ...state.viewport,
          graphId: action.payload,
        },
      }))
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
      }))
      .addCase(partSelectedEvent, (state: UIState, action) => ({
        ...state,
        rightPanel: {
          ...state.rightPanel,
          selectedPartId: action.payload.part.id,
        },
      }));
  },
});

export default composerSlice.reducer;
