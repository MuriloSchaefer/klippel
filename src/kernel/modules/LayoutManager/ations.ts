import { createAction } from "@reduxjs/toolkit";
import { MODULE_NAME } from "./constants";
import { ViewportTabState } from "./state";

// COMMANDS

// UI EVENTS

export const leftPanelExpanded = createAction(
  `[${MODULE_NAME}:UI] Left Panel Expanded`
);
export const leftPanelCollapsed = createAction(
  `[${MODULE_NAME}:UI] Left Panel Collapsed`
);
export const leftPanelTitleChanged = createAction<string>(
  `[${MODULE_NAME}:UI] Left Panel Title Changed`
);

export const rightPanelClosed = createAction(
  `[${MODULE_NAME}:UI] Right Panel Closed`
);
export const rightPanelOpened = createAction(
  `[${MODULE_NAME}:UI] Right Panel Opened`
);
export const rightPanelTitleChanged = createAction<string>(
  `[${MODULE_NAME}:UI] Right Panel Title Changed`
);

export const viewportAdded = createAction<ViewportTabState>(
  `[${MODULE_NAME}:UI] Viewport added`
);
export const viewportSelected = createAction<string>(
  `[${MODULE_NAME}:UI] Viewport selected`
);
export const viewportClosed = createAction<string>(
  `[${MODULE_NAME}:UI] Viewport closed`
);
export const changeViewportTitle = createAction<string>(
  `[${MODULE_NAME}:UI] Viewport title changed`
);
