import { createSlice } from "@reduxjs/toolkit";
import { LayoutModuleState } from "./state";

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

const initialLayoutModule: LayoutModuleState = {
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
    title: "Left P(state) => state.LayoutModule.anel",
    content: {},
  },
  rightPanel: {
    isOpen: false,
    title: "Right Panel",
    content: {},
  },
};

export const LayoutModuleSlice = createSlice({
  name: "LayoutModule",
  initialState: initialLayoutModule,
  reducers: {},
  // The `extraReducers` field use actions created outside the slice, therefore we can add proper naming
  extraReducers: (builder) => {
    builder
      .addCase(leftPanelCollapsed, (state: LayoutModuleState) => ({
        ...state,
        leftPanel: {
          ...state.leftPanel,
          isOpen: false,
        },
      }))
      .addCase(leftPanelExpanded, (state: LayoutModuleState) => ({
        ...state,
        leftPanel: {
          ...state.leftPanel,
          isOpen: true,
        },
      }))
      .addCase(
        leftPanelTitleChanged,
        (state: LayoutModuleState, { payload }) => ({
          ...state,
          leftPanel: {
            ...state.leftPanel,
            title: payload,
          },
        })
      )
      .addCase(rightPanelClosed, (state: LayoutModuleState) => ({
        ...state,
        rightPanel: {
          ...state.leftPanel,
          isOpen: false,
        },
      }))
      .addCase(rightPanelOpened, (state: LayoutModuleState) => ({
        ...state,
        rightPanel: {
          ...state.leftPanel,
          isOpen: true,
        },
      }))
      .addCase(
        rightPanelTitleChanged,
        (state: LayoutModuleState, { payload }) => ({
          ...state,
          rightPanel: {
            ...state.rightPanel,
            title: payload,
          },
        })
      )
      .addCase(viewportAdded, (state: LayoutModuleState, { payload }) => ({
        ...state,
        viewportManager: {
          activeTab: payload.id,
          tabs: [...state.viewportManager.tabs, payload],
        },
      }))
      .addCase(
        viewportSelected,
        (state: LayoutModuleState, { payload: id }) => ({
          ...state,
          viewportManager: {
            ...state.viewportManager,
            activeTab: id,
          },
        })
      )
      .addCase(viewportClosed, (state: LayoutModuleState, { payload: id }) => {
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

export default LayoutModuleSlice.reducer;
