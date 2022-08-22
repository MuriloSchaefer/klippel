import { createSlice } from "@reduxjs/toolkit";
import { KernelUI } from "./state";

import {
  leftPanelCollapsed,
  leftPanelExpanded,
  leftPanelTitleChanged,
  rightPanelClosed,
  rightPanelOpened,
  rightPanelTitleChanged,
  viewportAdded,
  viewportClosed,
  viewportSelected,
} from "./ations";

const initialKernelUI: KernelUI = {
  viewportManager: {
    activeTab: "welcome",
    tabs: [
      {
        id: "welcome",
        title: "Bem-vindo",
      },
    ],
  },
  leftPanel: {
    isOpen: true,
    title: "Left Panel",
    content: {},
  },
  rightPanel: {
    isOpen: false,
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
      .addCase(leftPanelTitleChanged, (state: KernelUI, { payload }) => ({
        ...state,
        leftPanel: {
          ...state.leftPanel,
          title: payload,
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
      }))
      .addCase(rightPanelTitleChanged, (state: KernelUI, { payload }) => ({
        ...state,
        rightPanel: {
          ...state.rightPanel,
          title: payload,
        },
      }))
      .addCase(viewportAdded, (state: KernelUI, { payload }) => ({
        ...state,
        viewportManager: {
          activeTab: payload.id,
          tabs: [...state.viewportManager.tabs, payload],
        },
      }))
      .addCase(viewportSelected, (state: KernelUI, { payload: id }) => ({
        ...state,
        viewportManager: {
          ...state.viewportManager,
          activeTab: id,
        },
      }))
      .addCase(viewportClosed, (state: KernelUI, { payload: id }) => {
        const tabs = state.viewportManager.tabs.filter((tab) => tab.id !== id);
        const nextTab = tabs.length > 0 ? tabs[0].id : "welcome";
        const activeTab =
          state.viewportManager.activeTab === id
            ? nextTab // QUESTION: how can we dispatch a `tabSelected` action here?
            : state.viewportManager.activeTab;
        return {
          ...state,
          viewportManager: {
            ...state.viewportManager,
            activeTab,
            tabs,
          },
        };
      });
  },
});

export default KernelUISlice.reducer;
