import { createSlice } from "@reduxjs/toolkit";

import {
  viewportAdded,
  viewportSelected,
} from "@kernel/modules/LayoutModule/ations";
import { UIState } from "./state";

import {
  startSVGLoad,
  SVGLoaded,
  parseGarment,
  materialSelectedEvent,
  garmentParseFinished,
} from "./actions";

const UIInitialState: UIState = {
  leftPanel: {},
  rightPanel: {
    selectedMaterialId: null,
  },
  viewport: {
    loadingSVG: false,
    parsing: {
      garment: false,
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
          selectedMaterialId: null,
        },
        viewport: {
          ...state.viewport,
          graphId: action.payload.id,
        },
      }))
      .addCase(viewportSelected, (state: UIState, action) => ({
        leftPanel: {},
        rightPanel: {
          selectedMaterialId: null,
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
      .addCase(parseGarment, (state: UIState) => ({
        ...state,
        viewport: {
          ...state.viewport,
          parsing: {
            ...state.viewport.parsing,
            garment: true,
          },
        },
      }))
      .addCase(garmentParseFinished, (state: UIState) => ({
        ...state,
        viewport: {
          ...state.viewport,
          parsing: {
            ...state.viewport.parsing,
            garment: false,
          },
        },
      }))
      .addCase(materialSelectedEvent, (state: UIState, action) => ({
        ...state,
        rightPanel: {
          ...state.rightPanel,
          selectedMaterialId: action.payload.id,
        },
      }));
  },
});

export default composerSlice.reducer;
