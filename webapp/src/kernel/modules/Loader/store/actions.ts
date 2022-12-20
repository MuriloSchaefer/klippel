import { ACTION_TYPES } from "@kernel/contants";
import { createAction } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../constants";


// Events
export const moduleStarted = createAction<string>(
`[${MODULE_NAME}:${ACTION_TYPES.EVENT}] Module started`
);

// Commands
export const startModule = createAction<string>(
    `[${MODULE_NAME}:${ACTION_TYPES.COMMAND}] Start module`
    );