import { ACTION_TYPES } from "@kernel/constants";
import { createAction } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../../constants";

// Commands
export const saveSession = createAction(
  `[${MODULE_NAME}:${ACTION_TYPES.COMMAND}] Save session`
);

export const createGraph = createAction<{ graphId: string }>(
    `[${MODULE_NAME}:GraphsManager:${ACTION_TYPES.COMMAND}] Create graph`
);

export const destroyGraph = createAction<{ graphId: string }>(
    `[${MODULE_NAME}:GraphsManager:${ACTION_TYPES.COMMAND}] Destroy graph`
);
// Events
export const SessionSaved = createAction(
  `[${MODULE_NAME}:${ACTION_TYPES.EVENT}] session saved`
);
export const graphsModuleLoaded = createAction(
    `[${MODULE_NAME}:${ACTION_TYPES.EVENT}:Init] Graph Module loaded`
);

export const graphCreated = createAction<{ graphId: string }>(
    `[${MODULE_NAME}:GraphsManager:${ACTION_TYPES.EVENT}] Graph created`
);
export const graphDestroyed = createAction<{ graphId: string }>(
    `[${MODULE_NAME}:GraphsManager:${ACTION_TYPES.EVENT}] Graph destroyed`
);