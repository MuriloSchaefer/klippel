import { createAction } from "@reduxjs/toolkit";
import { MODULE_NAME } from "./constants";

// COMMANDS

// UI EVENTS

export const leftPanelExpanded = createAction(
  `[${MODULE_NAME}:UI] Left Panel Expanded`
);
export const leftPanelCollapsed = createAction(
  `[${MODULE_NAME}:UI] Left Panel Collapsed`
);
