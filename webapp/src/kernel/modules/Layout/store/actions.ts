import { ACTION_TYPES } from "@kernel/contants";
import { PaletteMode } from "@mui/material";
import { createAction } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../constants";

// Commands
export const switchTheme = createAction<{theme: PaletteMode }>(
    `[${MODULE_NAME}:Theme:${ACTION_TYPES.COMMAND}] Switch theme`
);


// Events
export const themeSwitched = createAction<{theme: PaletteMode }>(
    `[${MODULE_NAME}:Theme:${ACTION_TYPES.EVENT}] Theme switched`
);