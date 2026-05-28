import { ACTION_TYPES } from "@kernel/constants";
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
export const listWorkspaces = createAction(
  `[${MODULE_NAME}:${ACTION_TYPES.COMMAND}] List workspaces`
);
export const selectWorkspace = createAction<{workspace: string}>(
  `[${MODULE_NAME}:${ACTION_TYPES.COMMAND}] Select workspace`
);
export const createWorkspace = createAction<{name: string}>(
  `[${MODULE_NAME}:${ACTION_TYPES.COMMAND}] Create workspace`
);
export const joinWorkspace = createAction<{name: string; coId: string; syncUrl: string}>(
  `[${MODULE_NAME}:${ACTION_TYPES.COMMAND}] Join workspace`
);
export const enableWorkspaceSync = createAction<{syncUrl: string}>(
  `[${MODULE_NAME}:${ACTION_TYPES.COMMAND}] Enable workspace sync`
);
export const refreshFromPeers = createAction(
  `[${MODULE_NAME}:${ACTION_TYPES.COMMAND}] Refresh from peers`
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
export const workspacesListed = createAction<{workspaces: string[]}>(
  `[${MODULE_NAME}:${ACTION_TYPES.COMMAND}] Workspaces listed`
);
export const workspaceSelected = createAction<{workspace: string}>(
  `[${MODULE_NAME}:${ACTION_TYPES.EVENT}] Workspace selected`
);
export const workspaceCreated = createAction<{name: string; coId?: string}>(
  `[${MODULE_NAME}:${ACTION_TYPES.EVENT}] Workspace created`
);
export const workspaceJoined = createAction<{name: string; coId: string; syncUrl: string}>(
  `[${MODULE_NAME}:${ACTION_TYPES.EVENT}] Workspace joined`
);
export const workspaceSyncEnabled = createAction<{syncUrl: string}>(
  `[${MODULE_NAME}:${ACTION_TYPES.EVENT}] Workspace sync enabled`
);
export const accountIdResolved = createAction<{accountId: string | null}>(
  `[${MODULE_NAME}:${ACTION_TYPES.EVENT}] Account id resolved`
);
export const syncStatusChanged = createAction<{status: 'offline' | 'syncing' | 'synced'}>(
  `[${MODULE_NAME}:${ACTION_TYPES.EVENT}] Sync status changed`
);
export const peersRefreshed = createAction(
  `[${MODULE_NAME}:${ACTION_TYPES.EVENT}] Peers refreshed`
);


