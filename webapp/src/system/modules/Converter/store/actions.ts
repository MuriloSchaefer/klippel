import { ACTION_TYPES } from "@kernel/contants";
import { createAction } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../constants"

// Commands
export const saveSession = createAction(
  `[${MODULE_NAME}:${ACTION_TYPES.COMMAND}] Save session`
);
export const loadConversionGraph = createAction(
    `[${MODULE_NAME}:${ACTION_TYPES.COMMAND}] Load conversion graph`
);

export const selectNode = createAction<string>(
    `[${MODULE_NAME}:${ACTION_TYPES.COMMAND}] Select node`
);


// Events
export const sessionSaved = createAction(
  `[${MODULE_NAME}:SVG:${ACTION_TYPES.EVENT}] session saved`
);
export const conversionGraphLoaded = createAction(
    `[${MODULE_NAME}:${ACTION_TYPES.EVENT}] Conversion graph loaded`
);
export const nodeSelected = createAction<string>(
    `[${MODULE_NAME}:${ACTION_TYPES.COMMAND}] Node selected`
);