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
export const setExtrasViewport = createAction<{name: string, extras: any}>(
    `[${MODULE_NAME}:Viewports:${ACTION_TYPES.COMMAND}] Set extras options`
);

export const addToGroup = createAction<{viewportName: string, groupName: string}>(
    `[${MODULE_NAME}:Viewports:${ACTION_TYPES.COMMAND}] Add viewport to group`
);
export const removeFromGroup = createAction<{viewportName: string}>(
    `[${MODULE_NAME}:Viewports:${ACTION_TYPES.COMMAND}] Viewport removed from group`
);


// Events
export const viewportAdded = createAction<ViewportState>(
    `[${MODULE_NAME}:Viewports:${ACTION_TYPES.EVENT}] Viewport added`
);
export const viewportSelected = createAction<ViewportState>(
    `[${MODULE_NAME}:Viewports:${ACTION_TYPES.EVENT}] Viewport selected`
);
export const viewportClosed = createAction<{name: string}>(
    `[${MODULE_NAME}:Viewports:${ACTION_TYPES.EVENT}] Viewport closed`
);
export const viewportRenamed = createAction<{oldName: string, newName: string}>(
    `[${MODULE_NAME}:Viewports:${ACTION_TYPES.EVENT}] Viewport renamed`
);
export const ExtrasViewportSet = createAction<{name: string, extras: any}>(
    `[${MODULE_NAME}:Viewports:${ACTION_TYPES.COMMAND}] Extras options set`
);
export const addedToGroup = createAction<{viewportName: string, groupName: string}>(
    `[${MODULE_NAME}:Viewports:${ACTION_TYPES.EVENT}] Viewport added to group`
);
export const removedFromGroup = createAction<{viewportName: string, groupName: string}>(
    `[${MODULE_NAME}:Viewports:${ACTION_TYPES.EVENT}] Viewport removed from group`
);