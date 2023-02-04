import { ACTION_TYPES } from "@kernel/contants";
import { createAction } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../constants";
import { CompositionState } from "./state";


// Commands
export const createComposition = createAction<{name: string, svgPath: string}>(
    `[${MODULE_NAME}:Compositions:${ACTION_TYPES.COMMAND}] Create composition`
);


// Events
export const compositionCreated = createAction<CompositionState>(
    `[${MODULE_NAME}:Compositions:${ACTION_TYPES.EVENT}] Composition created`
);