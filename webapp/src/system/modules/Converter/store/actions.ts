import { ACTION_TYPES } from "@kernel/contants";
import { createAction } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../constants"

// Commands
export const loadConversionGraph = createAction(
    `[${MODULE_NAME}:${ACTION_TYPES.COMMAND}] Load conversion graph`
);

export const selectNode = createAction(
    `[${MODULE_NAME}:${ACTION_TYPES.COMMAND}] Select node`
);


// Events
export const conversionGraphLoaded = createAction(
    `[${MODULE_NAME}:${ACTION_TYPES.EVENT}] Conversion graph loaded`
);
export const nodeSelected = createAction(
    `[${MODULE_NAME}:${ACTION_TYPES.COMMAND}] Node selected`
);