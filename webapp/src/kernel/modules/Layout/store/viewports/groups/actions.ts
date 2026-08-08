import { createAction } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../../../constants";
import { ACTION_TYPES } from "@kernel/constants";


export const createGroup = createAction<{name: string, color: string, label?: string}>(
    `[${MODULE_NAME}:Viewports:${ACTION_TYPES.COMMAND}] Create group`
);
export const deleteGroup = createAction<{name: string}>(
    `[${MODULE_NAME}:Viewports:${ACTION_TYPES.COMMAND}] Delete group`
);


export const groupCreated = createAction<{name: string, color: string, label?: string}>(
    `[${MODULE_NAME}:Viewports:${ACTION_TYPES.EVENT}] Group created`
);
export const groupDeleted = createAction<{name: string}>(
    `[${MODULE_NAME}:Viewports:${ACTION_TYPES.EVENT}] Group deleted`
);
