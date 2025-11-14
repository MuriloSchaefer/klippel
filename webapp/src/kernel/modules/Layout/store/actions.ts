import { ACTION_TYPES } from "@kernel/constants";
import type { PaletteMode } from "@mui/material";
import { createAction } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../constants";

// Commands
export const saveSession = createAction(
  `[${MODULE_NAME}:Session:${ACTION_TYPES.COMMAND}] Save session`
);

export const switchTheme = createAction<{theme: PaletteMode }>(
    `[${MODULE_NAME}:Theme:${ACTION_TYPES.COMMAND}] Switch theme`
);


// Events
export const sessionSaved = createAction(
    `[${MODULE_NAME}:${ACTION_TYPES.EVENT}] session saved`
  );
export const themeSwitched = createAction<{theme: PaletteMode }>(
    `[${MODULE_NAME}:Theme:${ACTION_TYPES.EVENT}] Theme switched`
);