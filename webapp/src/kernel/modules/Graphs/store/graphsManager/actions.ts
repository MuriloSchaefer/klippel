import { ACTION_TYPES } from "@kernel/contants";
import { createAction } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../../constants";


// Events
export const graphsModuleLoaded = createAction(
    `[${MODULE_NAME}:${ACTION_TYPES.EVENT}:Init] Graph Module loaded`
);

export const graphCreated = createAction<{ graphId: string }>(
    `[${MODULE_NAME}:${ACTION_TYPES.EVENT}] Graph created`
);
export const graphDestroyed = createAction<{ graphId: string }>(
    `[${MODULE_NAME}:${ACTION_TYPES.EVENT}] Graph destroyed`
);


// Commands
export const createGraph = createAction<{ graphId: string }>(
    `[${MODULE_NAME}:${ACTION_TYPES.COMMAND}] Create graph`
);

export const destroyGraph = createAction<{ graphId: string }>(
    `[${MODULE_NAME}:${ACTION_TYPES.COMMAND}] Destroy graph`
);