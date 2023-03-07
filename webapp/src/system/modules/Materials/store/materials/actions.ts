import { ACTION_TYPES } from "@kernel/contants";
import { createAction } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../../constants";

// Commands
export const loadMaterials = createAction<{ }>(
    `[${MODULE_NAME}:Materials:${ACTION_TYPES.COMMAND}] Load materials`
);

// Events
export const materialsLoaded = createAction<{ }>(
    `[${MODULE_NAME}:Materials:${ACTION_TYPES.EVENT}] Materials loaded`
);