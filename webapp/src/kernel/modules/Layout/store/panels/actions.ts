import { ACTION_TYPES } from "@kernel/contants";
import { createAction } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../../constants";

// Commands
export const expandSettings = createAction(
    `[${MODULE_NAME}:Panels:${ACTION_TYPES.COMMAND}] Expand settings panel`
);
export const collapseSettings = createAction(
    `[${MODULE_NAME}:Panels:${ACTION_TYPES.COMMAND}] Collapse settings panel`
);

export const openDetails = createAction(
    `[${MODULE_NAME}:Panels:${ACTION_TYPES.COMMAND}] Open details panel`
);
export const closeDetails = createAction(
    `[${MODULE_NAME}:Panels:${ACTION_TYPES.COMMAND}] Close details panel`
);


// Events
export const settingsExpanded = createAction(
    `[${MODULE_NAME}:Panels:${ACTION_TYPES.EVENT}] Settings panel expanded`
);
export const settingsCollapsed = createAction(
    `[${MODULE_NAME}:Panels:${ACTION_TYPES.EVENT}] Settings panel collapsed`
);

export const detailsOpened = createAction(
    `[${MODULE_NAME}:Panels:${ACTION_TYPES.EVENT}] Details panel opened`
);
export const detailsClosed = createAction<{viewportName: string}>(
    `[${MODULE_NAME}:Panels:${ACTION_TYPES.EVENT}] Details panel closed`
);