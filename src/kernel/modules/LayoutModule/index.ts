import { AnyAction, ListenerMiddlewareInstance } from "@reduxjs/toolkit";
import { Reducer } from "react";
import { IModule } from "../base";

// eslint-disable-next-line import/no-cycle
import reducer from "./slice";
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
import { LayoutModuleState } from "./state";
import { useViewportManager } from "./hooks/useViewportManager";
import useViewport, { useActiveViewport } from "./hooks/useViewport";

import { DETAILS_PANEL_ID, SETTING_PANEL_ID } from "./constants";

export interface ILayoutModule extends IModule {
  store: {
    actions: {
      leftPanelCollapsed: typeof leftPanelCollapsed;
      leftPanelExpanded: typeof leftPanelExpanded;
      leftPanelTitleChanged: typeof leftPanelTitleChanged;
      rightPanelClosed: typeof rightPanelClosed;
      rightPanelOpened: typeof rightPanelOpened;
      rightPanelTitleChanged: typeof rightPanelTitleChanged;
      viewportAdded: typeof viewportAdded;
      viewportClosed: typeof viewportClosed;
      viewportSelected: typeof viewportSelected;
    };
    middlewares: ListenerMiddlewareInstance[];
    reducers: {
      LayoutModule: Reducer<LayoutModuleState, AnyAction>;
    };
  };
  hooks: {
    useViewportManager: typeof useViewportManager;
    useViewport: typeof useViewport;
    useActiveViewport: typeof useActiveViewport;
  };
  constants: {
    SETTING_PANEL_ID: string;
    DETAILS_PANEL_ID: string;
  };
}

/**
 * SVG module handles any operation on SVG
 * such as loading, parsing, and serializing
 */
const LayoutModule: ILayoutModule = {
  name: "LayoutModule",
  components: {},
  store: {
    actions: {
      leftPanelCollapsed,
      leftPanelExpanded,
      leftPanelTitleChanged,
      rightPanelClosed,
      rightPanelOpened,
      rightPanelTitleChanged,
      viewportAdded,
      viewportClosed,
      viewportSelected,
    },
    middlewares: [],
    reducers: { LayoutModule: reducer },
  },
  hooks: {
    useViewportManager,
    useViewport,
    useActiveViewport,
  },
  constants: {
    SETTING_PANEL_ID,
    DETAILS_PANEL_ID,
  },
};

export default LayoutModule;
