
import { createAction } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../../../constants";
import { ACTION_TYPES } from "@kernel/contants";


export const createGroup = createAction<{name: string, color: string}>(
    `[${MODULE_NAME}:Viewports:${ACTION_TYPES.COMMAND}] Create group`
);


export const groupCreated = createAction<{name: string, color: string}>(
    `[${MODULE_NAME}:Viewports:${ACTION_TYPES.EVENT}] Group created`
);
