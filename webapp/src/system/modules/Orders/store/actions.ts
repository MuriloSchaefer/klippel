import { createAction } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../constants";
import { ACTION_TYPES } from "@kernel/constants";

// Commands
export const saveSession = createAction(
  `[${MODULE_NAME}:${ACTION_TYPES.COMMAND}] Save session`
);
// Events
export const sessionSaved = createAction(
  `[${MODULE_NAME}:${ACTION_TYPES.EVENT}] session saved`
);