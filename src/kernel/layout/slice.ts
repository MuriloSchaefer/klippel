import { createSlice } from "@reduxjs/toolkit";
import { KernelUIState } from "./state";

import { leftPanelCollapsed, leftPanelExpanded } from "./ations";

const initialKernelUIState: KernelUIState = {
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
  initialState: initialKernelUIState,
  reducers: {},
  // The `extraReducers` field use actions created outside the slice, therefore we can add proper naming
  extraReducers: (builder) => {
    builder
      .addCase(leftPanelCollapsed, (state: KernelUIState) => ({
        ...state,
        leftPanel: {
          ...state.leftPanel,
          isOpen: false,
        },
      }))
      .addCase(leftPanelExpanded, (state: KernelUIState) => ({
        ...state,
        leftPanel: {
          ...state.leftPanel,
          isOpen: true,
        },
      }));
  },
});

export default KernelUISlice.reducer;
