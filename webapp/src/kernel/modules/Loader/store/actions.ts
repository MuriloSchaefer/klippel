import { ACTION_TYPES } from "@kernel/constants";
import { createAction } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../constants";


// Commands
export const saveSession = createAction(
    `[${MODULE_NAME}:${ACTION_TYPES.COMMAND}] Save session`
  );
  export const startModule = createAction<string>(
      `[${MODULE_NAME}:${ACTION_TYPES.COMMAND}] Start module`
      );

// Events
export const sessionSaved = createAction(
  `[${MODULE_NAME}:SVG:${ACTION_TYPES.EVENT}] session saved`
);
export const moduleStarted = createAction<string>(
`[${MODULE_NAME}:${ACTION_TYPES.EVENT}] Module started`
);
