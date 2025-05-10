import { ACTION_TYPES } from "@kernel/contants";
import { createAction } from "@reduxjs/toolkit";
import { MODULE_NAME } from "./constants";

export const saveSession = createAction(
  `[${MODULE_NAME}:${ACTION_TYPES.COMMAND}] Save session`
);
export const pauseSessionAutoSaver = createAction(
  `[${MODULE_NAME}:${ACTION_TYPES.COMMAND}] Pause session auto saver`
);
export const resumeSessionAutoSaver = createAction<{interval: number}>(
  `[${MODULE_NAME}:${ACTION_TYPES.COMMAND}] Resume session auto saver`
);
export const selectWorkspace = createAction<{workspace: string}>(
  `[${MODULE_NAME}:${ACTION_TYPES.COMMAND}] Select workspace`
);

// Events
export const storeInitialized = createAction(
  `[${MODULE_NAME}:${ACTION_TYPES.EVENT}:Init] Store initialized`
);
export const sessionSaved = createAction(
  `[${MODULE_NAME}:${ACTION_TYPES.EVENT}] session saved`
);
export const sessionAutoSaverPaused = createAction(
  `[${MODULE_NAME}:${ACTION_TYPES.EVENT}] Session auto saver paused`
);
export const sessionAutoSaverResumed = createAction(
  `[${MODULE_NAME}:${ACTION_TYPES.EVENT}] Session auto saver resumed`
);
export const workspaceSelected = createAction<{workspace: string}>(
  `[${MODULE_NAME}:${ACTION_TYPES.EVENT}] Workspace selected`
);


