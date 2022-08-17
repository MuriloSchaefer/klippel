import { createSlice } from "@reduxjs/toolkit";
import { KernelUI } from "./state";

import {
  leftPanelCollapsed,
  leftPanelExpanded,
  rightPanelClosed,
  rightPanelOpened,
} from "./ations";

const initialKernelUI: KernelUI = {
  leftPanel: {
    isOpen: true,
    title: "Left Panel",
    content: {},
  },
  rightPanel: {
    isOpen: true,
    title: "Right Panel",
    content: {},
  },
};

export const KernelUISlice = createSlice({
  name: "kernelUI",
  initialState: initialKernelUI,
  reducers: {},
  // The `extraReducers` field use actions created outside the slice, therefore we can add proper naming
  extraReducers: (builder) => {
    builder
      .addCase(leftPanelCollapsed, (state: KernelUI) => ({
        ...state,
        leftPanel: {
          ...state.leftPanel,
          isOpen: false,
        },
      }))
      .addCase(leftPanelExpanded, (state: KernelUI) => ({
        ...state,
        leftPanel: {
          ...state.leftPanel,
          isOpen: true,
        },
      }))
      .addCase(rightPanelClosed, (state: KernelUI) => ({
        ...state,
        rightPanel: {
          ...state.leftPanel,
          isOpen: false,
        },
      }))
      .addCase(rightPanelOpened, (state: KernelUI) => ({
        ...state,
        rightPanel: {
          ...state.leftPanel,
          isOpen: true,
        },
      }));
  },
});

export default KernelUISlice.reducer;
