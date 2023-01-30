import { createAction } from "@reduxjs/toolkit";

import { ACTION_TYPES } from "@kernel/contants";

import { MODULE_NAME } from "../../constants";
import { ViewportState } from "./state";

// Commands
export const addViewport = createAction<ViewportState>(
    `[${MODULE_NAME}:Viewports:${ACTION_TYPES.COMMAND}] Add viewport`
);
export const selectViewport = createAction<{name: string}>(
    `[${MODULE_NAME}:Viewports:${ACTION_TYPES.COMMAND}] Select viewport`
);
export const closeViewport = createAction<{name: string}>(
    `[${MODULE_NAME}:Viewports:${ACTION_TYPES.COMMAND}] Close viewport`
);
export const renameViewport = createAction<{oldName: string, newName: string}>(
    `[${MODULE_NAME}:Viewports:${ACTION_TYPES.COMMAND}] Rename viewport`
);

// Events
export const viewportAdded = createAction<ViewportState>(
    `[${MODULE_NAME}:Viewports:${ACTION_TYPES.EVENT}] Viewport added`
);
export const viewportSelected = createAction<ViewportState>(
    `[${MODULE_NAME}:Viewports:${ACTION_TYPES.EVENT}] Viewport selected`
);
export const viewportClosed = createAction<ViewportState>(
    `[${MODULE_NAME}:Viewports:${ACTION_TYPES.EVENT}] Viewport closed`
);
export const viewportRenamed = createAction<{oldName: string, newName: string}>(
    `[${MODULE_NAME}:Viewports:${ACTION_TYPES.EVENT}] Viewport renamed`
);