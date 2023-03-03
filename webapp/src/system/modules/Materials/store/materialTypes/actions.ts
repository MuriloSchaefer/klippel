import { ACTION_TYPES } from "@kernel/contants";
import { createAction } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../../constants";

// Commands
export const loadMaterialTypes = createAction<{ }>(
    `[${MODULE_NAME}:Materials:${ACTION_TYPES.COMMAND}] Load material types`
);

// Events
export const materialTypesLoaded = createAction<{ }>(
    `[${MODULE_NAME}:Materials:${ACTION_TYPES.EVENT}] Material types loaded`
);